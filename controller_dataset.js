import * as tf from '@tensorflow/tfjs';

//一个网络摄像头控件的数据集，允许用户添加示例张量用于特殊标签。该对象将它们连接成两个大的xs和ys。
export class ControllerDataset {
  constructor(numClasses) {
    this.numClasses = numClasses;
  }

  /**
   * 向控制器数据集添加一个示例。
   * 一个张量代表这个例子。它可以是一个图像， 激活，或任何其他张量类型。
   */
  addExample(example, label) {
    // 热编码标签。
    const y = tf.tidy(
        () => tf.oneHot(tf.tensor1d([label]).toInt(), this.numClasses));

    if (this.xs == null) {
      /**
       * 对于第一个添加的例子，保留example和y，
       * 这样 ControllerDataset拥有输入的内存。
       * 这确保了如果在tf.tidy()中调用addExample()，这些张量将不会得到处理。 
       * tf.tidy() 可清理执行函数后未被该函数返回的所有 tf.Tensor，类似于执行函数时清理局部变量的方式：
      */ 
      this.xs = tf.keep(example);
      this.ys = tf.keep(y);
    } else {
      const oldX = this.xs;

      this.xs = tf.keep(oldX.concat(example, 0));

      const oldY = this.ys;
      this.ys = tf.keep(oldY.concat(y, 0));

      oldX.dispose();
      oldY.dispose();
      y.dispose();
    }
  }
}
