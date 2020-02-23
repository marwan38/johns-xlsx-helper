// eslint-disable-next-line import/prefer-default-export
export function returnFileMeta(file) {
  const { name, path } = file;
  return { name, path };
}
