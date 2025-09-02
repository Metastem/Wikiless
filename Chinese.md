[English](README.md) | [中文](Chinese.md) | [فارسی](Persian.md)

# Wikiless

![hidden_dimension](https://github.com/user-attachments/assets/4093053d-a7c4-45aa-8860-ea0f64a841e9)

**Wikiless** 是一个免费、开源的维基百科替代前端，专注于隐私保护。该项目旨在通过最小化数据收集和跟踪，为用户提供更私密和匿名的浏览体验。

### 功能特性
- **隐私优先**：通过限制数据跟踪来增强用户隐私。
- **开源共享**：任何人都可以贡献和改进。
- **替代前端**：提供访问维基百科的另一种界面。
- **抗审查**：在多个被屏蔽的国家提供访问维基百科的途径，实现免翻墙浏览维基百科。

## 安装

运行 Wikiless 的步骤如下：
```
https://github.com/V4NT-ORG/Wikiless/wiki
```


## 使用方法

在浏览器中访问 ```http://localhost:8180```，即可本地使用 Wikiless。

## 贡献

欢迎所有形式的贡献！

## TODO

- [x] - 修复点击缩略图后图片无法加载的问题 - [#161](https://github.com/Metastem/Wikiless/issues/161) 和 [#162](https://github.com/Metastem/Wikiless/pull/162)
- [x] - 修复在设置为其他默认语言时，所有语言链接失效的问题 - [#161](https://github.com/Metastem/Wikiless/issues/161)
- [x] - 已修复 [Code Scanning](https://github.com/V4NT-ORG/Wikiless-Reborn/security/code-scanning) 中的 10 个安全问题
- [x] - 进一步加固 ```Dockerfile```
- [x] - 修复了一些小 bug，并在 [```docker-compose.yml```](https://www.baeldung.com/ops/docker-memory-limit) 中添加了内存和 CPU 限制
- [ ] - 支持其他维基百科样式 - [#25](https://github.com/Metastem/Wikiless/issues/25)
- [ ] - 如果某个实例被封锁，则支持条件性跳转 - [#21](https://github.com/Metastem/Wikiless/issues/21)
- [ ] - 修复 MediaWiki CSS 文件循环下载错误
- [ ] - 修复搜索路由错误 - [#166](https://github.com/Metastem/Wikiless/issues/166)
- [ ] - 增加不同语言版本，帮助用户在本国突破政府审查

## 许可证

本项目基于 **GNU Affero General Public License v3.0** 进行授权。
