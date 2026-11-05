# 晶格 · 材科基研习室

创作人 **Drinking Ice Man**

材料科学基础闪卡、章节搜索、闭卷抽题、自定义组卷和错题复测。主页复用此前创作的奶龙学习搭档，点击切换九种学习状态。学习记录保存在当前浏览器。

## 一键自部署

进入本目录，安装 Python 3 后运行：

```sh
sh deploy.sh
```

打开 http://127.0.0.1:8080 。需要改端口时运行 `PORT=9000 sh deploy.sh`。Windows 可在此目录运行 `py server.py`。

上线时，把整个 `dist/` 发布到任意静态站点托管服务。静态模式可使用内置题库和复习功能。AI 制题需要下面的本机服务。公开版从 jsDelivr 加载固定版本的 KaTeX。

## 修改内容

- `dist/data.js` 放通用题库、卡片和来源配置。
- `dist/study-cards.js` 放教材参考章节和分步解析。
- `dist/imported-bank.js` 是附加题库入口。按文件注释填写你有权使用的资料。
- `dist/study-figures/` 放原创建模示意图。

公开版随附通用题库和教材参考入口。第三方教材原书、真题扫描图、上传的题库资料和私人文件链接仅用于私用版。

## 许可与署名

项目原创源码按 MIT 许可发布。奶龙角色权利归其原权利方，形象与动作参考 [mosterpath/pet-nailong](https://github.com/mosterpath/pet-nailong)，本项目复用先前重绘的状态图。角色图像与第三方学习资料不纳入源码许可。

## 自配 AI 接口

每位使用者在自己的电脑启动一份服务，使用自己的模型地址、模型名和密钥。需要支持 OpenAI 兼容的 Chat Completions 接口。

```sh
export JINGGE_API_BASE=https://api.openai.com/v1
export JINGGE_MODEL=你的模型名
export JINGGE_API_KEY=你的密钥
sh deploy.sh
```

Windows PowerShell 使用 `$env:JINGGE_API_BASE`、`$env:JINGGE_MODEL`、`$env:JINGGE_API_KEY` 设置对应环境变量，再运行 `py server.py`。打开 http://127.0.0.1:8080 并进入「AI 制题」。服务仅监听本机，请勿通过公网反向代理暴露此实例。

粘贴笔记即可使用。导入有文字层的 PDF 需要安装 Poppler 的 `pdftotext`，最多读取前 20 页（文件上限 5 MB，文字上限 24,000 字符）。扫描件请先 OCR。提取的文字会发送到用户配置的模型服务。生成后可编辑并勾选保存，名词解释、简答和计算题也可作为题源参与组卷。原文引用检查用于核对出处，答案仍需自行审核。
