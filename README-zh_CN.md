# Abbreviations and Acronyms

[English](./README.md) | **简体中文** | [繁體中文](./README-zh_TW.md)

## 介绍

这是一个用于 [Obsidian](https://obsidian.md) 的插件，实现自动标记缩略语和术语。

此插件支持在阅读视图、编辑视图（*实时阅览*）和源码模式（可选）渲染，同时支持列出当前文件中的所有缩略语，以及缩略语元素的上下文菜单。

## 用法

### 定义缩略语

您可以在[属性](#属性)或者使用 [Markdown Extra](#markdown-extra) 语法定义缩略语。

#### 属性

插件通过读取笔记[属性（元数据）](https://help.obsidian.md/Editing+and+formatting/Properties)中的指定字段获取缩略语。您可以使用[字符串](#字符串)列表或[键值对](#键值对)列表来定义缩略语。

##### 字符串

在字符串中使用冒号(`:`)分隔缩写和全称。示例：

```yaml
---
abbr:
  - "HTML: HyperText Markup Language"
  - "CSS: Cascading Style Sheets"
---
```

> [!TIP]
> 这种格式的优点是可以在显示模式中直接添加或删除缩略语。

##### 键值对

使用缩写作为键，全称作为值。示例：

```yaml
---
abbr:
  - HTML: HyperText Markup Language
  - CSS: Cascading Style Sheets
---
```

#### Markdown Extra

> [!NOTE]
> 目前还没有统一的语法规范，该插件的实现类似于 [PHP Markdown Extra](https://michelf.ca/projects/php-markdown/extra/#abbr)。

您需要在插件设置中[启用 Markdown Extra 语法支持](#markdown-extra-语法)才能激活此功能。插件通过读取笔记中指定格式的内容来获取缩略语。

要定义一个缩略语，只需在笔记中某一行的开头声明，例如：

```text
*[W3C]: World Wide Web Consortium
```

也可以通过将值置为空来禁用指定缩略语：

```text
*[W3C]: 
```

建议使用空行将定义区域与主要内容分隔开。例如：

```text
You can use CSS to style your HTML. 

*[HTML]: HyperText Markup Language
*[CSS]: Cascading Style Sheets

Using style sheets, you can keep your CSS presentation layer and HTML content layer separate.
```

### 相同的缩略语

当存在多个相同的缩略语时，其适用范围如下：

```text
---
abbr:
  - RAM: Random Access Memory
---

RAM.

*[RAM]: Reliability, Availability, Maintainability

RAM.

*[RAM]: Remote Access Management

RAM.

*[RAM]: 

RAM.

```

渲染为：

```html
<abbr title="Random Access Memory">RAM</abbr>.

<abbr title="Reliability, Availability, Maintainability">RAM</abbr>.

<abbr title="Remote Access Management">RAM</abbr>.

RAM.
```

## 命令

### 添加缩略语

快速将缩略语添加到[属性（元数据）](https://help.obsidian.md/Editing+and+formatting/Properties)。

### 复制并格式化内容

复制笔记内容并将缩略语转换为 `<abbr>` 标签，以便在不支持类似语法的其他 Markdown 编辑器中显示它们。

例如，对于以下笔记内容：

```text
---
tags:
  - test
abbr:
  - HTML: HyperText Markup Language
---
# Example

You can use CSS to style your HTML. 

*[CSS]: Cascading Style Sheets

Using style sheets, you can keep your `CSS` presentation layer and `HTML` content layer separate.
```

此命令将复制以下内容到剪贴板：

```markdown
# Example

You can use <abbr title="Cascading Style Sheets">CSS</abbr> to style your <abbr title="HyperText Markup Language">HTML</abbr>. 

Using style sheets, you can keep your `CSS` presentation layer and `HTML` content layer separate.
```

### 插入 Extra 定义

*此命令仅在[启用 Markdown Extra 语法支持](#markdown-extra-语法)设置后才允许使用。*

在活动编辑器中，将 Markdown Extra 语法定义插入到当前光标位置。

当未选择任何文本时，插入以下内容：

```text
*[<光标位置>]: 
```

当选定文本时，插入以下内容：

```text
*[<选定文本>]: <光标位置>
```

### 缩略语列表

列出当前文件中所有缩略语，然后选择一个并跳转到其定义位置（对于 Markdown Extra 语法定义的缩略语），或直接编辑它（对于元数据或全局缩略语）。

### 管理全局缩略语

快速地管理[全局缩略语](#全局缩略语)。

## 设置

### 元数据关键词

此插件允许您自定义从[属性](https：//help.obsidian.md/Editing+and+formatting/Properties)中读取缩略语的关键词，默认值为 `abbr`。

### 在源码模式中标记缩略语

在源码模式下标记缩略语，与在实时阅览和阅读视图中一样。

### 启用非空格分隔语言的缩略语检测

检测不使用空格进行分词的语言中的缩略语，例如中文。

举例来说，对于以下笔记内容：

```text
---
abbr:
  - "北大: 北京大学"
---

我是一名北大学子。
```

仅当启用此选项时，它才会渲染为：

```html
我是一名<abbr title="北京大学">北大</abbr>学子。
```

否则，保持原样：

```html
我是一名北大学子。
```

### 全局缩略语

此插件允许您自定义全局可用的缩略语。它们的优先级低于在笔记中定义的缩略语。

### Markdown Extra 语法

控制是否启用 Markdown Extra 语法功能。

此外，您还可以向编辑视图中显示一个装饰器，用于标识 Markdown Extra 语法的定义。装饰器的内容可以使用两个变量：`${abbr}` 和 `${tooltip}`，用于将当前定义的某些信息引入内容。例如，对于 `→ ${abbr}`：

![decorator-example](images/definition-decorator.jpg)

CSS 变量 `--abbreviations-definition-decorator-margin` 可用于定义装饰器的间距，例如：

```css
body {
  --abbreviations-definition-decorator-margin: 12px;
}
```

### 后缀

此插件允许匹配带有词尾的缩略语。例如，它可以使得 `OS` 能够匹配到 `OSes`。更多信息请参见：[#3](https://github.com/dragonish/obsidian-abbreviations/issues/3)。

后缀列表由用户定义，值以逗号(`,`)分隔的字符串形式设置，例如：`s, es, less`。

## 预览

**实时阅览：**

| 源码模式 | 实时阅览 |
| :----: | :-----: |
| ![source-mode](images/source-mode.png) | ![live-preview](images/live-preview.png) |

**阅读视图：**

| 源码模式 | 阅读视图 |
| :----: | :-----: |
| ![source-mode](images/source-mode.png) | ![reading](images/reading.png) |

## 许可

[MIT](/LICENSE)
