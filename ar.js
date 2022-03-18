import createjs from "createjs-npm";

// 获取 canvas 元素
let canvas;
// 舞台
let stage;
// 定义 3 个旋转方向
let rotations = [90, 180, 270];
// 保存当前方向索引
let zoom = 0;
// 容器
let container;
// 获取 视力图 元素
let node = document.getElementById("ar");
// 设置 视力图 宽度
node.style.width = "100px";
// 设置 视力图 高度
node.style.height = "100px";

canvas = document.getElementById("gameView");
stage = new createjs.Stage(canvas);
container = new createjs.Container();

// 容器加入舞台
stage.addChild(container);
// 设置container在中心
container.x = -50;
container.y = 25;

var content = new createjs.DOMElement(node);
container.addChild(content);
stage.update();

// 将容器shape向右向下移动50，此时注册点也移动到了标准坐标系(50, -50)处
// 位置
content.x = 50;
content.y = 50;
// 显示对象的注册点的左偏移量
// 通过regX再给容器移动到原来的位置，此时“身体“进行了移动，但是注册点并没有移动
content.regX = 50;
content.regY = 50;

export function change() {
  let random1 = Math.floor(Math.random() * 3); // [0, 2]
  let rotationAngle = rotations[random1]; // 选中的旋转角度

  zoom = zoom + random1 < 3 ? zoom + random1 + 1 : zoom + random1 - 3;

  content.rotation = content.rotation + rotationAngle;
  // [1,10]
  let random2 = Math.random() * 10 + 1; // [1, 11) 放大倍数
  while (random2 > 10) {
    random2 = Math.random() * 10 + 1;
  }
  let minification = random2 * 0.1;
  content.scaleX = minification; // 缩放倍数
  content.scaleY = minification;
  stage.update();
  return zoom;
}
