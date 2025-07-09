import fetch from 'node-fetch';
import fs from 'node:fs/promises';

import { VALID_PATH_FILE, NAME_PREFIX, TEST_NAME_PREFIX } from './constant.js';
import { GITHUB_ACCESS_TOKEN } from './api-key.js';
import { logger } from './utils.js';
import { fetchCozeDocumentList } from './create-coze-document.js';

/**
 * https://docs.github.com/zh/rest/repos/contents?apiVersion=2022-11-28#get-repository-content
 * 参数：
 * recursive :递归获取 仓库文件结构
 */
const formilyGithubUrl = 'https://api.github.com/repos/alibaba/formily/git/trees/formily_next?recursive=1';

/**
 * 1. packages\/(core|react|reactive)\/docs/xxx
 * 2. docs/xxx
 */
const validPathReg = /^((packages\/(core|react|reactive)\/docs)|(docs))(.|\/)*\.md$/;
const validZhPathReg = /^((packages\/(core|react|reactive)\/docs)|(docs))(.|\/)*\.zh-CN.md$/;

const defaultGenerateConfig = {
  /** 是否只生成中文 */
  zhOnly: true,
  /** 是否是测试 */
  isTest: false,
};

export const generateFormilyDocList = async (params) => {
  try {
    const { zhOnly, isTest } = params || defaultGenerateConfig;
    // 递归获取 仓库的目录结构
    const formilyGithubPromise = fetch(formilyGithubUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${GITHUB_ACCESS_TOKEN}`,
      },
    }).then((res) => res.json());
    // 获取 知识库 全量文件列表
    const cozeDocumentListPromise = fetchCozeDocumentList(params);

    const [formilyGithubData, cozeDocumentListData] = await Promise.all([
      formilyGithubPromise,
      cozeDocumentListPromise,
    ]);

    const cozeDocumentUrlList = cozeDocumentListData.document_infos.map((item) => item.web_url);

    const targetValidPathReg = zhOnly ? validZhPathReg : validPathReg;
    const validPathList = formilyGithubData.tree
      .filter((item) => targetValidPathReg.test(item.path))
      .map((item) => {
        const newItem = {
          path: item.path,
          name: `${isTest ? TEST_NAME_PREFIX : NAME_PREFIX}_${item.path.replace(/\//g, '_')}`,
          web_url: `https://raw.githubusercontent.com/alibaba/formily/refs/heads/formily_next/${item.path}`,
        };
        // 标记是否是新增的  web_url
        newItem.is_new_current_run = !cozeDocumentUrlList.includes(newItem.web_url);
        return newItem;
      });

    const filtered_path_count = validPathList.filter((item) => item.is_new_current_run).length;
    const result = {
      date: new Date().getTime(),
      valid_path_list: validPathList,
    };
    logger.debug('generateFormilyDocList', {
      date: result.date,
      valid_path_count: validPathList.length,
      filtered_path_count: filtered_path_count,
    });
    await fs.writeFile(VALID_PATH_FILE, JSON.stringify(result));
  } catch (err) {
    logger.error('generateFormilyDocList', err);
  }
};

// generateFormilyDocList({
//   zhOnly: true,
//   isTest: true,
// });
