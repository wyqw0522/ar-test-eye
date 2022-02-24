import * as tf from '@tensorflow/tfjs';

/**
 * A dataset for webcam controls which allows the user to add example Tensors
 * for particular labels. This object will concat them into two large xs and ys.
 */
//一个网络摄像头控件的数据集，允许用户添加示例张量用于特殊标签。该对象将它们连接成两个大的xs和ys。
export class ControllerDataset {
  constructor(numClasses) {
    this.numClasses = numClasses;
  }

  /**
   * 向控制器数据集添加一个示例。
   * Adds an example to the controller dataset.
   * 一个张量代表这个例子。它可以是一个图像， 激活，或任何其他张量类型。
   * @param {Tensor} example A tensor representing the example. It can be an image,
   *     an activation, or any other type of Tensor.
   *  label示例的标签。应该是一个数字。
   * @param {number} label The label of the example. Should be a number.
   */
  addExample(example, label) {
    // One-hot encode the label.
    // 热编码标签。
    const y = tf.tidy(
        () => tf.oneHot(tf.tensor1d([label]).toInt(), this.numClasses));

    if (this.xs == null) {
      // For the first example that gets added, keep example and y so that the
      // ControllerDataset owns the memory of the inputs. This makes sure that
      // if addExample() is called in a tf.tidy(), these Tensors will not get
      // disposed.

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
