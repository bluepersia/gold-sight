class OrderIDCounter {
  private count: number = -1;

  public next(): number {
    this.count++;
    return this.count;
  }
}

const counter = new OrderIDCounter();
export { counter };
