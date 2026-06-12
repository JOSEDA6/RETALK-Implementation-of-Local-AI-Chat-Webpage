"""
RETALK 打包脚本 — 使用 PyInstaller 将后端打包为独立 .exe

用法:
    python build_exe.py

输出目录: dist_exe/
"""

import os
import sys
import subprocess
import shutil

# 项目根目录
ROOT = os.path.dirname(os.path.abspath(__file__))

# 待打包的数据目录
DATA_DIRS = {
    "dist": os.path.join(ROOT, "dist"),    # 前端构建产物
    "uploads": os.path.join(ROOT, "uploads"),  # 上传目录（运行时创建）
}


def main():
    # ── 1. 确保前端已构建 ──────────────────────────────────────────────
    if not os.path.isdir(DATA_DIRS["dist"]):
        print("[INFO] 未找到 dist/，尝试构建前端...")
        frontend_dir = os.path.join(os.path.dirname(ROOT), "frontend")
        if os.path.isdir(frontend_dir):
            subprocess.run(["npm", "install"], cwd=frontend_dir, check=True, shell=True)
            subprocess.run(["npm", "run", "build"], cwd=frontend_dir, check=True, shell=True)
            print("[OK] 前端构建完成")
        else:
            print("[ERROR] 找不到 frontend/ 目录")
            sys.exit(1)

    # 复制前端 dist 到 backend 目录
    backend_dist = DATA_DIRS["dist"]
    if not os.path.isdir(backend_dist):
        src_dist = os.path.join(os.path.dirname(ROOT), "frontend", "dist")
        if os.path.isdir(src_dist):
            shutil.copytree(src_dist, backend_dist)
            print(f"[OK] 前端文件已复制到 {backend_dist}")
        else:
            print(f"[ERROR] 找不到前端 dist 目录: {src_dist}")
            sys.exit(1)

    # ── 2. 收集 hidden imports ──────────────────────────────────────
    hidden_imports = [
        "uvicorn",
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets.auto",
        "sqlalchemy",
        "sqlalchemy.sql.default_comparator",
        "aiosqlite",
        "bcrypt",
        "pypdf",
        "python_docx",
        "httpx",
        "aiofiles",
        "multipart",
        "pydantic",
        "pydantic_settings",
        "jose",
        "ollama",
    ]

    # ── 3. 组装 PyInstaller 命令 ────────────────────────────────────
    # Anaconda 环境中有很多不相关的包，排除掉以加快打包并减小体积
    excludes = [
        "PyQt5", "PySide6", "PyQt6", "PySide2",  # Qt 绑定
        "matplotlib", "numpy", "scipy",           # 科学计算
        "PIL",                                     # 图像处理
        "pandas", "notebook", "jupyter",           # 数据相关
        "zmq", "IPython", "ipykernel",             # IPython 相关
        "tensorflow", "torch", "torchvision",      # ML 框架
        "tkinter",                                  # GUI
        "setuptools", "_distutils_hack",
        "nacl", "cffi", "pycparser",
        "yapf", "autopep8", "blib2to3",
        "zmq", "jinja2", "MarkupSafe",
    ]

    cmd = [
        "pyinstaller",
        "--clean",
        "--noconfirm",
        "--onedir",                           # 目录模式（比单文件启动快）
        f"--name=RETALK",
        f"--distpath={os.path.join(ROOT, 'dist_exe')}",
        f"--specpath={os.path.join(ROOT, 'build_spec')}",
        f"--workpath={os.path.join(ROOT, 'build_temp')}",
        # 数据文件
        f"--add-data={DATA_DIRS['dist']};dist",
        # 排除无关包
    ]
    for mod in excludes:
        cmd.append(f"--exclude={mod}")
    # 隐藏导入
    for mod in hidden_imports:
        cmd.append(f"--hidden-import={mod}")
    for mod in hidden_imports:
        cmd.append(f"--hidden-import={mod}")

    # 数据文件（.env 配置 — 可选）
    env_file = os.path.join(ROOT, ".env")
    if os.path.isfile(env_file):
        cmd.append(f"--add-data={env_file};.")

    # 是否使用 UPX（如果有）
    upx_dir = shutil.which("upx")
    if upx_dir:
        cmd.append("--upx-dir")
        cmd.append(os.path.dirname(upx_dir))

    cmd.append(os.path.join(ROOT, "run.py"))

    # ── 4. 执行打包 ──────────────────────────────────────────────────
    print("=" * 60)
    print("  RETALK 打包开始")
    print("=" * 60)
    print(f"[INFO] 工作目录: {ROOT}")
    print(f"[INFO] 输出目录: {os.path.join(ROOT, 'dist_exe')}")
    print(f"[INFO] 命令: {' '.join(cmd)}")
    print()

    subprocess.run(cmd, cwd=ROOT, check=True)

    # ── 5. 清理临时文件 ──────────────────────────────────────────────
    for d in ["build_spec", "build_temp"]:
        p = os.path.join(ROOT, d)
        if os.path.isdir(p):
            shutil.rmtree(p)
    spec_file = os.path.join(ROOT, "RETALK.spec")
    if os.path.isfile(spec_file):
        os.remove(spec_file)

    print()
    print("=" * 60)
    print("  打包完成!")
    print(f"  可执行文件: {os.path.join(ROOT, 'dist_exe', 'RETALK', 'RETALK.exe')}")
    print("=" * 60)
    print()
    print("启动方式:")
    print("  1. 确保 Ollama 已启动 (http://localhost:11434)")
    print("  2. 双击 RETALK.exe")
    print("  3. 浏览器访问 http://localhost:8000")
    print()


if __name__ == "__main__":
    main()
