# 晶格 · 材科基研习室

创作人 **Drinking Ice Man**

材料科学基础闪卡、章节搜索、闭卷抽题、自定义组卷和错题复测。主页复用此前创作的奶龙学习搭档，点击切换九种学习状态。学习记录保存在当前浏览器。

## 一键自部署

进入本目录，安装 Python 3 后运行：

```sh
sh deploy.sh
```

打开 http://127.0.0.1:8080 。需要改端口时运行 `PORT=9000 sh deploy.sh`。Windows 可在此目录运行 `py -m http.server 8080 --bind 127.0.0.1 --directory dist`。

上线时，把整个 `dist/` 发布到任意静态站点托管服务。无需后端、数据库或 API 密钥。公开版从 jsDelivr 加载固定版本的 KaTeX。

## 修改内容

- `dist/data.js` 放通用题库、卡片和来源配置。
- `dist/study-cards.js` 放教材参考章节和分步解析。
- `dist/imported-bank.js` 是附加题库入口。按文件注释填写你有权使用的资料。
- `dist/study-figures/` 放原创建模示意图。

公开版随附通用题库和教材参考入口。第三方教材原书、真题扫描图、上传的题库资料和私人文件链接仅用于私用版。

## 许可与署名

项目原创源码按 MIT 许可发布。奶龙角色权利归其原权利方，形象与动作参考 [mosterpath/pet-nailong](https://github.com/mosterpath/pet-nailong)，本项目复用先前重绘的状态图。角色图像与第三方学习资料不纳入源码许可。
