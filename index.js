import * as tf from "@tensorflow/tfjs";
import * as tfd from "@tensorflow/tfjs-data";

import { ControllerDataset } from "./controller_dataset";
import * as ui from "./ui";
import * as ar from "./ar";

// 我们想要预测的类别数量。在本例中，我们将是 预测上、下、左、右四个类别。
const NUM_CLASSES = 4;

// 一个摄像头迭代器，从摄像头的图像生成张量。
let webcam;
let predicted = false; // 是否预测完成
// 我们将在其中存储激活的数据集对象
const controllerDataset = new ControllerDataset(NUM_CLASSES);

let truncatedMobileNet;
let model;
let ar_id;
let flag = true; // 游戏是否结束
let ar_act;
let mp = new Map();
let score = 0;

mp.set(0, 3);
mp.set(1, 1);
mp.set(2, 2);
mp.set(3, 0);

//  加载 mobilenet 并返回一个模型，该模型返回我们将使用作为我们的分类器模型的输入的内部激活。
async function loadTruncatedMobileNet() {
  const mobilenet = await tf.loadLayersModel(
    "https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json"
  );

  //  返回一个输出内部激活的模型。
  // 其中函数返回的tf.model中输入还是mobilenet的原始输入，输出为mobilenet的“conv_pw_13_relu”层。
  // 一般而言，因为越靠后所包含的训练信息越多，所以应选择已训练好的模型中越靠后的层。
  const layer = mobilenet.getLayer("conv_pw_13_relu");
  return tf.model({ inputs: mobilenet.inputs, outputs: layer.output });
}

//当UI按钮被按下时，从摄像头读取帧并关联
//使用按钮给出的类标签。上，下，左，右是
//标签分别为0,1,2,3。
ui.setExampleHandler(async (label) => {
  // 得到捕获并归一化后的图像
  let img = await getImage();

  controllerDataset.addExample(truncatedMobileNet.predict(img), label);

  // 绘制预览缩略图。
  ui.drawThumb(img, label);
  img.dispose();
});

/**
 * 设置和训练分类器。
 */
async function train() {
  if (controllerDataset.xs == null) {
    throw new Error("Add some examples before training!");
  }

  // 创建一个两层完全连接的模型。
  // 通过创建一个单独的模型，而不是添加层到mobilenet模型，
  // 我们“冻结”的 mobilenet 模型的权重，并且只训练来自新模型的权重。

  model = tf.sequential({
    layers: [
      // 将输入压平为一个矢量，这样我们就可以在一个密集的层中使用它。
      // 即使技术上是一个层，这只执行一个重塑(没有训练参数)。
      tf.layers.flatten({
        inputShape: truncatedMobileNet.outputs[0].shape.slice(1),
      }),
      // Layer 1.
      tf.layers.dense({
        units: ui.getDenseUnits(),
        activation: "relu",
        kernelInitializer: "varianceScaling",
        useBias: true,
      }),
      // 最后一层的单元数应该对应 表示我们想要预测的类的数量。
      tf.layers.dense({
        units: NUM_CLASSES,
        kernelInitializer: "varianceScaling",
        useBias: false,
        activation: "softmax",
      }),
    ],
  });

  // 创建驱动模型训练的优化器。
  const optimizer = tf.train.adam(ui.getLearningRate());
  // 我们使用了category crossentropy，这是我们用于分类的损失函数，
  // 它测量了我们预测的类概率分布(输入是每个类的概率)与标签(真实类的100%概率)>之间的误差
  model.compile({ optimizer: optimizer, loss: "categoricalCrossentropy" });

  // 我们将批处理大小参数化为整个数据集的一部分，
  // 因为收集的示例数量取决于用户收集的示例数量。这允许我们有一个灵活的批量大小。
  const batchSize = Math.floor(
    controllerDataset.xs.shape[0] * ui.getBatchSizeFraction()
  );
  if (!(batchSize > 0)) {
    throw new Error(
      `Batch size is 0 or NaN. Please choose a non-zero fraction.`
    );
  }

  // 因为训练模型时，Model.fit() 会打乱 xs 和 ys，所以我们不是必须这么做
  model.fit(controllerDataset.xs, controllerDataset.ys, {
    batchSize,
    epochs: ui.getEpochs(),
    callbacks: {
      onBatchEnd: async (batch, logs) => {
        ui.trainStatus("Loss: " + logs.loss.toFixed(5));
      },
    },
  });
}

let isPredicting = false;

async function predict() {
  ui.isPredicting();
  console.log("进入预测");
  if (isPredicting) {
    // 从网络摄像头捕获帧。
    const img = await getImage();
    // 通过mobilenet做预测，得到内部激活 mobilenet模型，即输入图像的“嵌入”。
    const embeddings = truncatedMobileNet.predict(img);

    // 通过我们新训练的模型使用嵌入进行预测 从mobilenet作为输入。
    const predictions = model.predict(embeddings);

    // 以最大概率返回索引。这个号码对应 指向模型认为是给定输入的最可能的类。
    const predictedClass = predictions.as1D().argMax();
    const classId = (await predictedClass.data())[0];
    // console.log("预测的原结果是", classId);
    ar_id = mp.get(classId);
    console.log("预测的结果是", ar_id);
    predicted = true;
    if (ar_id === ar_act) {
      console.log("预测正确");
      const corn_btn = document.getElementById("score");
      score++;
      corn_btn.innerHTML = score;
    } else {
      console.log("预测错误");
      flag = false;
    }

    img.dispose();

    // ui.predictClass(classId);
    await tf.nextFrame();
  }
}
// 从摄像头捕捉帧，并使其在-1和1之间归一化。
// 返回一个形状为[1,w, h, c]的批处理图像(一个元素批处理)。
async function getImage() {
  const img = await webcam.capture();
  const processedImg = tf.tidy(() =>
    img.expandDims(0).toFloat().div(127).sub(1)
  );
  img.dispose();
  return processedImg;
}

document.getElementById("train").addEventListener("click", async () => {
  ui.trainStatus("Training...");
  // tf.nextFrame() 用于返回确定 requestAnimationFrame 已终止的承诺。
  await tf.nextFrame();
  await tf.nextFrame();
  isPredicting = false;
  train();
});
document.getElementById("predict").addEventListener("click", () => {

  play();
  ui.donePredicting();
});

function play() {
  const realNum = ar.change();

  console.log("真实值：", realNum);
  console.log("等待五秒钟");
  ar_act = realNum;
  isPredicting = true;
  if (isPredicting) {
    let y = setTimeout(() => {
      predict();
      clearTimeout(y);
    }, 5000);
  }

  let t = 6;
  let x = setInterval(function () {
    t--;
    if (t === 0 && flag === false) {
      clearInterval(x);
      flag = true; // 否则第二次点击 play 会出现错误，从而没有读秒
      alert("gameover\n 您的分数为 " + score + " 分");
      score = 0;
      predicted = false;
      isPredicting = false;
      return;
    } else if (t === 0 && flag === true){

    } else{
      console.log("还有" + t + "秒");
    }
    if (flag === true && predicted) {
      clearInterval(x);
      predicted = false;
      play();
    }
  }, 1000);
}

async function init() {
  try {
    // 得到 index.html 123 行的摄像机
    webcam = await tfd.webcam(document.getElementById("webcam"));
  } catch (e) {
    document.getElementById("no-webcam").style.display = "block";
  }

  // 加载 mobilenet 并返回一个模型，该模型返回我们将使用作为我们的分类器模型的输入的内部激活。
  truncatedMobileNet = await loadTruncatedMobileNet();

  // 得到控制面板，初始化时让它隐藏
  ui.init();

  // 预热模型。这将向GPU上传权重并编译 WebGL 程序，这样我们第一次从网络摄像头收集数据，这将会很快
  const screenShot = await webcam.capture();
  truncatedMobileNet.predict(screenShot.expandDims(0));
  // 释放资源
  screenShot.dispose();
}

// 译文: 初始化应用程序。
init();
