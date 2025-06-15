#!/usr/bin/env python3
"""
简单的图标生成脚本
使用PIL库生成基础的PNG图标文件
"""

import os
from PIL import Image, ImageDraw, ImageFont
import json

def create_icon(size):
    """创建指定尺寸的图标"""
    # 创建画布
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 绘制渐变背景圆形
    # 简化版：使用纯色背景
    center = size // 2
    radius = size // 2 - 2
    
    # 绘制背景圆
    draw.ellipse([2, 2, size-2, size-2], fill=(102, 126, 234, 255))
    
    # 绘制白色圆环
    ring_radius = size // 3
    ring_width = max(1, size // 16)
    draw.ellipse([center-ring_radius, center-ring_radius, 
                  center+ring_radius, center+ring_radius], 
                 outline=(255, 255, 255, 255), width=ring_width)
    
    # 绘制中心点
    dot_radius = size // 8
    draw.ellipse([center-dot_radius, center-dot_radius,
                  center+dot_radius, center+dot_radius],
                 fill=(255, 255, 255, 255))
    
    # 添加文字（仅在较大尺寸时）
    if size >= 32:
        try:
            # 尝试使用系统字体
            font_size = size // 6
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            # 如果没有找到字体，使用默认字体
            font = ImageFont.load_default()
        
        text = "UCG"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        text_x = (size - text_width) // 2
        text_y = int(size * 0.75 - text_height // 2)
        
        draw.text((text_x, text_y), text, fill=(255, 255, 255, 255), font=font)
    
    # 绘制边框
    draw.ellipse([1, 1, size-1, size-1], outline=(51, 51, 51, 255), width=1)
    
    return img

def main():
    """主函数"""
    print("🎨 开始生成插件图标...")
    
    # 创建icons目录
    icons_dir = "icons"
    if not os.path.exists(icons_dir):
        os.makedirs(icons_dir)
    
    # 生成各种尺寸的图标
    sizes = [16, 32, 48, 128]
    
    for size in sizes:
        try:
            icon = create_icon(size)
            filename = os.path.join(icons_dir, f"icon{size}.png")
            icon.save(filename, "PNG")
            print(f"✅ 生成 icon{size}.png")
        except Exception as e:
            print(f"❌ 生成 icon{size}.png 失败: {e}")
    
    print("🎉 图标生成完成！")
    
    # 更新manifest.json
    print("🔧 更新manifest.json...")
    try:
        with open("manifest.json", "r", encoding="utf-8") as f:
            manifest = json.load(f)
        
        # 添加图标配置
        manifest["icons"] = {
            "16": "icons/icon16.png",
            "32": "icons/icon32.png",
            "48": "icons/icon48.png", 
            "128": "icons/icon128.png"
        }
        
        # 添加action图标
        if "default_icon" not in manifest["action"]:
            manifest["action"]["default_icon"] = {
                "16": "icons/icon16.png",
                "32": "icons/icon32.png",
                "48": "icons/icon48.png",
                "128": "icons/icon128.png"
            }
        
        with open("manifest.json", "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        
        print("✅ manifest.json 更新完成")
        
    except Exception as e:
        print(f"❌ 更新manifest.json失败: {e}")
    
    print("\n🚀 现在可以重新加载插件了！")
    print("📋 步骤：")
    print("1. 在Chrome扩展页面点击刷新按钮")
    print("2. 或者移除插件后重新加载")
    print("3. 确认插件图标正常显示")

if __name__ == "__main__":
    try:
        from PIL import Image, ImageDraw, ImageFont
        main()
    except ImportError:
        print("❌ 未安装PIL库，请先安装：pip install Pillow")
        print("💡 或者使用浏览器版本：打开 create-icons.html")
