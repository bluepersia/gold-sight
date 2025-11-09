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

export { AbsCounter };
