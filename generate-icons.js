/**
 * 生成插件图标的Node.js脚本
 * 使用Canvas API生成PNG图标文件
 */

const fs = require('fs');
const path = require('path');

// 检查是否有canvas库
let Canvas;
try {
  Canvas = require('canvas');
} catch (e) {
  console.log('❌ 未安装canvas库，请先安装：npm install canvas');
  console.log('💡 或者使用浏览器版本：打开 create-icons.html');
  process.exit(1);
}

const { createCanvas } = Canvas;

// 创建icons目录
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// 图标尺寸
const sizes = [16, 32, 48, 128];

// 生成图标
function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // 清除画布
  ctx.clearRect(0, 0, size, size);
  
  // 绘制渐变背景
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  
  // 绘制圆形背景
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 2, 0, 2 * Math.PI);
  ctx.fill();
  
  // 绘制白色圆环
  ctx.strokeStyle = 'white';
  ctx.lineWidth = Math.max(1, size / 16);
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/3, 0, 2 * Math.PI);
  ctx.stroke();
  
  // 绘制内部圆点
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/8, 0, 2 * Math.PI);
  ctx.fill();
  
  // 绘制文字 "UCG"
  if (size >= 32) {
    ctx.fillStyle = 'white';
    ctx.font = `bold ${size/6}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('UCG', size/2, size * 0.75);
  }
  
  // 添加边框
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 1, 0, 2 * Math.PI);
  ctx.stroke();
  
  return canvas;
}

// 生成所有尺寸的图标
console.log('🎨 开始生成插件图标...');

sizes.forEach(size => {
  try {
    const canvas = generateIcon(size);
    const buffer = canvas.toBuffer('image/png');
    const filename = path.join(iconsDir, `icon${size}.png`);
    
    fs.writeFileSync(filename, buffer);
    console.log(`✅ 生成 icon${size}.png`);
  } catch (error) {
    console.error(`❌ 生成 icon${size}.png 失败:`, error.message);
  }
});

console.log('🎉 图标生成完成！');
console.log('📁 图标保存在:', iconsDir);

// 更新manifest.json
console.log('🔧 更新manifest.json...');

const manifestPath = path.join(__dirname, 'manifest.json');
try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  // 添加图标配置
  manifest.icons = {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png", 
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  };
  
  // 添加action图标
  if (!manifest.action.default_icon) {
    manifest.action.default_icon = {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png", 
      "128": "icons/icon128.png"
    };
  }
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✅ manifest.json 更新完成');
  
} catch (error) {
  console.error('❌ 更新manifest.json失败:', error.message);
}

console.log('\n🚀 现在可以重新加载插件了！');
console.log('📋 步骤：');
console.log('1. 在Chrome扩展页面点击刷新按钮');
console.log('2. 或者移除插件后重新加载');
console.log('3. 确认插件图标正常显示');
