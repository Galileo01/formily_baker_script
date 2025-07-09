import { createCozeDocument } from './create-coze-document.js';
import { generateFormilyDocList } from './generate-formily-doc-list.js';

const run = async () => {
  await generateFormilyDocList();

  await createCozeDocument();
};

run();
