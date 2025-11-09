class AbsCounter {
  private index: number = 0;
  private targetIndex: number;
  constructor(targetIndex: number) {
    this.targetIndex = targetIndex;
  }

  match() {
    if (this.index === this.targetIndex) {
      return true;
    }
    this.index++;
    return false;
  }
}

class AbsIndex {
  private _index: number = 0;
  private _fullIndex: number = 0;

  feed(value?: any) {
    this._fullIndex++;

    if (!value) return;

    this._index++;
  }
}
export { AbsCounter, AbsIndex };
