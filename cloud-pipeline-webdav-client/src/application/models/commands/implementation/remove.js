import Operation from './operation';

class RemoveOperation extends Operation {
  constructor(sourceFS, sources, progressCallback) {
    super(progressCallback);
    this.sources = (sources || []).map(path => ({path}));
    this.fileSystem = sourceFS;
  }
  preprocess() {
    return new Promise((resolve, reject) => {
      super.preprocess()
        .then(() => {
          if (!this.fileSystem) {
            throw new Error('Internal error: file system is not initialized');
          }
          if (this.aborted) {
            resolve();
            return;
          }
          resolve(this.fileSystem);
        })
        .catch(reject);
    });
  }
  invoke(fs) {
    const invokeForElement = (index, array, callback) => {
      if (index >= array.length) {
        return Promise.resolve();
      }
      if (this.aborted) {
        return Promise.resolve();
      }
      callback(index, 1);
      return new Promise((resolve) => {
        fs.remove(array[index].path)
          .catch(e => array[index].error = e)
          .then(() => {
            callback(index, 100);
            return invokeForElement(index + 1, array, callback);
          })
          .then(resolve);
      });
    }
    return new Promise((resolve, reject) => {
      if (this.aborted) {
        resolve();
        return;
      }
      invokeForElement(0, this.sources, (idx, progress) => {
        const element = this.sources[idx];
        const prevProgress = 100.0 / this.sources.length * idx;
        this.reportProgress(
          prevProgress + progress / this.sources.length,
          `Removing ${element.path}...`,
        );
      })
        .then(() => resolve(this.sources))
        .catch(reject);
    });
  }
}

export default RemoveOperation;
