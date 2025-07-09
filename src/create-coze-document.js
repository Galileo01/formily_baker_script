import fetch from 'node-fetch';
import fs from 'node:fs/promises';
import { chunk } from 'lodash-es';

import { VALID_PATH_FILE, COZE_DOCUMENT_DATASET_ID, COZE_TEST_DOCUMENT_DATASET_ID } from './constant.js';
import { COZE_ACCESS_TOKEN } from './api-key.js';
import { generateFormilyDocList } from './generate-formily-doc-list.js';
import { logger } from './utils.js';

/**
 * https://bots.bytedance.net/docs/developer_guides/create_knowledge_files
 */
export const cozeDocumentCreateUrl = 'https://api.coze.cn/open_api/knowledge/document/create';

/**
 * https://bots.bytedance.net/docs/developer_guides/list_knowledge_files
 */
export const cozeDocumentListUrl = 'https://api.coze.cn/open_api/knowledge/document/list';

/**
 * https://bots.bytedance.net/docs/developer_guides/delete_knowdge_files
 */
export const cozeDocumentDeleteUrl = 'https://api.coze.cn/open_api/knowledge/document/delete';

export const fetchCreateCozeDocument = async (params) => {
  const { chunk, chunkIndex, isTest } = params;
  try {
    const resData = await fetch(cozeDocumentCreateUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${COZE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Agw-Js-Conv': 'str',
      },
      body: JSON.stringify({
        dataset_id: isTest ? COZE_TEST_DOCUMENT_DATASET_ID : COZE_DOCUMENT_DATASET_ID,
        document_bases: chunk.map((item) => ({
          name: item.name,
          source_info: {
            web_url: item.web_url,
            document_source: 1, // 上传在线网页时必选 1
          },
          update_rule: {
            update_type: 1, // 1:自动更新
            update_interval: 7 * 24, // 7天更新一次
          },
        })),
        chunk_strategy: {
          chunk_type: 0, // 自动分段
        },
      }),
    })
      .then((res) => {
        logger.debug('fetchCreateCozeDocument', {
          chunk_index: chunkIndex,
          'x-tt-logid': res.headers.get('x-tt-logid'),
        });
        return res.json();
      })
      .catch((err) => {
        logger.error('fetchCreateCozeDocument', { chunk_index: chunkIndex, err });
      });

    const successCount = resData.document_infos.filter((item) => item.status !== 9).length; // 9 处理失败，建议重新上传

    logger.debug('fetchCreateCozeDocument', {
      chunk_index: chunkIndex,
      success_count: successCount,
      chunk_path_count: chunk.length,
    });
    return {
      successCount,
      chunkPathCount: chunk.length,
    };
  } catch (err) {
    logger.error('fetchCreateCozeDocument', { chunk_index: chunkIndex, err });
    return {
      successCount: 0,
      chunkPathCount: chunk.length,
    };
  }
};

export const createCozeDocument = async (params) => {
  const { isTest } = params || {};
  try {
    const contestStr = await fs.readFile(VALID_PATH_FILE);
    const data = JSON.parse(contestStr);
    const newValidPathList = data.valid_path_list.filter((item) => item.is_new_current_run);
    // console.log('dev newValidPathList', newValidPathList);
    // HTTP 接口一次最多支持10个在线文档的创建,这里需要10个分片
    const chunkList = chunk(newValidPathList, 10);
    // 批量提交
    const batchPromiseList = Promise.all(
      chunkList.map((chunk, index) =>
        fetchCreateCozeDocument({
          chunk: chunk,
          chunkIndex: index,
          isTest,
        })
      )
    );
    const batchRes = await batchPromiseList;

    const totalSuccessCount = batchRes.reduce((preValue, item) => preValue + item.successCount, 0);

    logger.debug('createCozeDocument', {
      total_success_count: totalSuccessCount,
      total_count: newValidPathList.length,
    });
  } catch (err) {
    logger.error('createCozeDocument', err);
  }
};

export const fetchCozeDocumentList = (params) => {
  const { isTest } = params || {};
  return fetch(cozeDocumentListUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${COZE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Agw-Js-Conv': 'str',
    },
    body: JSON.stringify({
      dataset_id: isTest ? COZE_TEST_DOCUMENT_DATASET_ID : COZE_DOCUMENT_DATASET_ID,
      page: 0,
      size: 100,
    }),
  }).then((res) => res.json());
};

export const batchDeleteCozeDocument = async (params) => {
  try {
    const cozeDocumentListData = await fetchCozeDocumentList(params);
    const cozeDocumentDeleteData = await fetch(cozeDocumentDeleteUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${COZE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Agw-Js-Conv': 'str',
      },
      body: JSON.stringify({
        document_ids: cozeDocumentListData.document_infos.map((item) => item.document_id),
      }),
    }).then((res) => res.json());

    logger.debug('batchDeleteCozeDocument', cozeDocumentDeleteData);
  } catch (err) {
    logger.error('batchDeleteCozeDocument', err);
  }
};

// const test = async () => {
//   const isTest = true;
//   await generateFormilyDocList({
//     zhOnly: true,
//     isTest,
//   });

//   await createCozeDocument({
//     isTest,
//   });
// };

// test();

// batchDeleteCozeDocument({
//   isTest: true,
// });
