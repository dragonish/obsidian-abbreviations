# Abbreviations and Acronyms

> Obsidian Plugin

## Introduction

This is a plugin for [Obsidian](https://obsidian.md).

Implements automatic marking of abbreviations and acronyms (terminology).

## Usage

Gets the abbreviations by reading the specified field in the note [properties(metadata)](https://help.obsidian.md/Editing+and+formatting/Properties), and automatically render the abbreviations in the note content.

This plugin supports rendering in both editing view (*Live Preview*) and reading view.

### Metadata format

You can use arrays of strings or key-value pairs.

#### Strings

Use a colon (`:`) in the string to separate the abbreviation and the tooltip.

Example:

```yaml
---
abbr:
  - "HTML: HyperText Markup Language"
  - "CSS: Cascading Style Sheets"
---
```

> [!TIP]
> The advantage of this format is that abbreviations can be added or removed directly in display mode.

#### Key-value pairs

Use the abbreviation for key and the tooltip for value.

Example:

```yaml
abbr:
  - HTML: HyperText Markup Language
  - CSS: Cascading Style Sheets
```

## Settings

### Metadata keyword

This plugin allows you to customize the keyword that read abbreviations from [properties](https://help.obsidian.md/Editing+and+formatting/Properties), default value is `abbr`.

### Global abbreviations

This plugin allows you to customize globally available abbreviations.

If you want to disable a specific abbreviation in your notes, you can declaring the abbreviation as an empty string value in the [properties](https://help.obsidian.md/Editing+and+formatting/Properties).

Example:

```yaml
---
abbr:
  - "HTML:  " # string format
  - CSS: "" # key-value pair format
---
```

## Preview

**Live Preview:**

| Source mode | Live Preview |
| :---------: | :----------: |
| ![source-mode](images/source-mode.png) | ![live-preview](images/live-preview.png) |

**Reading:**

| Source mode | Reading |
| :---------: | :-----: |
| ![source-mode](images/source-mode.png) | ![reading](images/reading.png) |

## License

[MIT](/LICENSE) license
