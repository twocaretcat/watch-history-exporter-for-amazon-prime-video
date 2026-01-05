<!-- Project Header -->
<div align="center">
  <img class="projectLogo" src="screenshot.png" alt="Project logo" title="Project logo" width="512">
  <h1 class="projectName">Watch History Exporter for Amazon Prime Video</h1>
  <p class="projectBadges">
    <img src="https://johng.io/badges/category/Script.svg" alt="Project category" title="Project category">
    <img src="https://img.shields.io/github/languages/top/twocaretcat/watch-history-exporter-for-amazon-prime-video.svg" alt="Language" title="Language">
    <img src="https://img.shields.io/github/repo-size/twocaretcat/watch-history-exporter-for-amazon-prime-video.svg" alt="Repository size" title="Repository size">
    <a href="LICENSE"><img src="https://img.shields.io/github/license/twocaretcat/watch-history-exporter-for-amazon-prime-video.svg" alt="Project license" title="Project license"/></a>
  </p>
  <p class="projectDesc">
    A script to export your Amazon Prime Video watch history as a CSV file.
  </p>
  <br/>
</div>

## 👋 About

This script runs in your browser and allows you to save your watch history from [Amazon Prime Video] to a CSV file, where it can be processed further or imported into other platforms.

### Features

- **⚡ Browser-based:** Run the script directly in your browser, no installation required
- **📥 Detailed export:** Save your complete watch history as a CSV file with the following columns:
  - Date Watched (date and time)
  - Type (movie or TV show)
  - Title
  - Episode Title (for TV shows)
- **🌍 Multi-language support:** Built-in support for the following languages:
  - Deutsch
  - English
  - Español
  - Español Latinoamérica
  - Français
  - Português (Brasil)
  - Português (Portugal)
  - 日本語
  - 简体中文
  - 繁體中文

### How it Works

Pasting the script into your your browser's console lets it interact with the page and extract watch history like so:

1. The first chunk of watch history data is delivered with the page as a JSON string embedded in a `<script type="text/template">` tag. The script finds and extracts this data and parses it into a JavaScript object
2. The rest of the watch history is loaded with API calls when you scroll down the page. To get this data, we monkey-patch the built-in `fetch` to listen for responses containing the desired data
3. To actually make the API calls, we simulate scrolling to the bottom of the page
4. Once all data is loaded, we construct a CSV file and trigger a download using a data URL

Previous versions of this script parsed the DOM directly, but the data available in the DOM is not as complete and adding support for multiple languages requires writing a lot of extra code for handling locale-specific dates and other strings.

## 🕹️ Usage

> [!CAUTION]
> For security reasons, I do not recommend running scripts from the internet unless you understand what they are doing. If you are not a developer, I recommend reading the comments in the code and/or asking a LLM like [ChatGPT] to explain it to you.

> [!WARNING]
> Don't scroll down the page before you run the script. Scrolling will cause new items to be loaded before the script is able to see them, meaning there will be missing movie/shows in the output. I recommend reloading the page and then running the script.

**Instructions:**

1. Open [primevideo.com/settings/watch-history] in your browser</li>
2. Open your browser's devtools console ([how?](https://balsamiq.com/support/faqs/browserconsole/))
3. Copy the code in [watch-history-exporter-for-amazon-prime-video.js] and paste it into the console. If this doesn't work or you see a warning message about pasting, see the [FAQ].
4. Press enter to run the script. You should see the script running in the console and you'll be prompted to save a file when it finishes. If this doesn't happen, see the [FAQ].

## 🤖 Advanced Usage

### Formatting Dates

By default, dates and times are saved in an RFC 3339-like format like `yyyy-mm-dd hh:mm:ss.sss`. Dates in this format are human-readable and easily understood by most spreadsheet programs.

If you plan on using the CSV data programmatically, you can instead output raw Unix timestamps like `1759024824173`. Note that this is in milliseconds.


To do this, change the `FORMAT_DATES` variable at the top of the script from `true` to `false`.

## 🛟 Support

Need help? See the [support resources](https://github.com/twocaretcat/.github/blob/main/docs/SUPPORT.md) for information on how to:

- request features
- report bugs
- ask questions
- report security vulnerabilities

### FAQ

<details>
  <summary><b>Nothing shows up when I paste in the console / I get a warning when I try to paste in the console</b></summary><br/>

  Some browsers prevent you from pasting code in the console because it could be malicious. This is called Paste Protection and you can read more about it on the [Chrome for Developers Blog].

  If this happens, follow the instructions in the console to re-enable pasting, and then try again. For Chrome, the following steps should work:

  1. Try to paste something in the console. You should get a warning message about pasting
  2. Type "allow pasting" in the console and press enter

  See [this video] for a visual walkthrough.

</details>

<details>
  <summary><b>I get an <code>Uncaught SyntaxError: Unexpected identifier</code> error when running the script</b></summary><br/>

  Make sure that you select the entire file with <kbd>Ctrl</kbd> + <kbd>A</kbd> when copying it. If part of the script is cut off, it won't work.

</details>

<details>
  <summary><b>The script runs, but I am not prompted to save a file</b></summary><br/>

  If you have a default download folder set, check if the file is there.

  Otherwise, make sure "Pop-ups and redirects" and "Automatic downloads" are enabled for <www.primevideo.com> in your browser settings.

</details>

<details>
  <summary><b>Something else is broken</b></summary><br/>

  If you can't get things working, you can try running an older version of the script. [v2.1.0](../../tree/v2.1.0) uses a different method to export your watch history than the current version, so it may work if the current version doesn't.

</details>

## 🤝 Contributing

Want to help out? Pull requests are welcome for:

- feature implementations
- bug fixes
- translations
- documentation
- tests

See the [contribution guide](../../contribute) for more details.

## 🧾 License

Copyright © 2026 [John Goodliff](https://johng.io/r/watch-history-exporter-for-amazon-prime-video) ([@twocaretcat](https://github.com/twocaretcat)).

This project is released into the public domain (attribution is appreciated but not required 🙂). See the [license](LICENSE) for details.

## 💕 Funding

Find this project useful? [Sponsoring me](https://johng.io/funding) will help me cover costs and **_commit_** more time to open-source.

If you can't donate but still want to contribute, don't worry. There are many other ways to help out, like:

- 📢 reporting (submitting feature requests & bug reports)
- 👨‍💻 coding (implementing features & fixing bugs)
- 📝 writing (documenting & translating)
- 💬 spreading the word
- ⭐ starring the project

I appreciate the support!

[FAQ]: #FAQ
[watch-history-exporter-for-amazon-prime-video.js]: watch-history-exporter-for-amazon-prime-video.js
[primevideo.com/settings/watch-history]: https://www.primevideo.com/settings/watch-history
[Amazon Prime Video]: https://www.primevideo.com
[this video]: https://youtu.be/X5uyCtVD1-o?si=AOrzgez90KiDlA-z&t=11
[Chrome for Developers Blog]: https://developer.chrome.com/blog/self-xss
[ChatGPT]: https://chatgpt.com/
