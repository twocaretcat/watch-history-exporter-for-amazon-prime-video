<!-- Project Header -->
<div align="center">
  <img class="projectLogo" src="screenshot.png" alt="Project logo" title="Project logo" width="512">
  <h1 class="projectName">Watch History Exporter for Amazon Prime Video</h1>
  <p class="projectBadges info">
    <img src="https://johng.io/badges/category/Script.svg" alt="Project category" title="Project category">
    <img src="https://img.shields.io/github/languages/top/twocaretcat/watch-history-exporter-for-amazon-prime-video.svg" alt="Language" title="Language">
    <img src="https://img.shields.io/github/repo-size/twocaretcat/watch-history-exporter-for-amazon-prime-video.svg" alt="Repository size" title="Repository size">
    <a href="LICENSE"><img src="https://img.shields.io/github/license/twocaretcat/watch-history-exporter-for-amazon-prime-video.svg" alt="Project license" title="Project license"/></a>
  </p>
  <p class="projectBadges status">
    <a href="https://github.com/twocaretcat/watch-history-exporter-for-amazon-prime-video/releases/latest"><img src="https://img.shields.io/github/v/release/twocaretcat/watch-history-exporter-for-amazon-prime-video.svg" alt="Latest release" title="Latest release"/></a>
  </p>
  <p class="projectDesc">
    A script to export your Amazon Prime Video watch history as a JSON or CSV file.
  </p>
  <br/>
</div>

## 👋 About

This script runs in your browser and allows you to save your watch history from [Amazon Prime Video] to a JSON or CSV
file, where it can be processed further or imported into other platforms.

### Features

- **⚡ Browser-based:** Run the script directly in your browser, no installation required
- **📥 Detailed export:** Save your complete watch history as a JSON or CSV file with the following [columns](#columns):
  - Date Watched (date and time)
  - Type (movie or TV show)
  - Title
  - Episode Title (for TV shows)
  - Global Title Identifier (GTI)
  - Episode Global Title Identifier (GTI)
  - Path (URL)
  - Episode Path (URL)
  - Image URL
- **🌍 Multi-language support<sup>1</sup>:** Built-in support for every language supported by Amazon Prime
- **⚙️ Flexible configuration**: Power users can easily modify values used by the script to suit their needs, like:
  - [mode](#interactivity) (interactive or headless)
  - [output format](#output-format) (JSON or CSV)
  - [output filename](#output-filename)
  - [date format](#date-formats) (human-readable or Unix Timestamp)
  - [delimiters](#custom-delimiters)
  - [column names](#custom-column-names)

_<sup>1</sup> Column names will still be in English, but you can easily [edit the values](#custom-column-names) in the
script or resulting file if you wish._

### How it Works

Pasting the script into your your browser's console lets it interact with the page and extract watch history like so:

1. The first chunk of watch history data is delivered with the page as a JSON string embedded in a
   `<script type="text/template">` tag. The script finds and extracts this data and parses it into a JavaScript object
2. The rest of the watch history is loaded with API calls when you scroll down the page. To get this data, we
   monkey-patch the built-in `fetch` to listen for responses containing the desired data
3. To actually make the API calls, we simulate scrolling to the bottom of the page
4. Once all data is loaded, we construct a CSV file and trigger a download using a data URL

Previous versions of this script parsed the DOM directly, but the data available in the DOM is not as complete and
adding support for multiple languages requires writing a lot of extra code for handling locale-specific dates and other
strings.

## 🕹️ Usage

> [!CAUTION]
> For security reasons, I do not recommend running scripts from the internet unless you understand what they are doing.
> If you are not a developer, I recommend reading the comments in the code and/or asking a LLM like [ChatGPT] to explain
> it to you.

> [!WARNING]
> Don't scroll down the page before you run the script. Scrolling will cause new items to be loaded before the script is
> able to see them, meaning there will be missing movie/shows in the output. I recommend reloading the page and then
> running the script.

**Instructions:**

1. Open [primevideo.com/settings/watch-history] in your browser</li>
2. Open your browser's devtools console ([how?](https://balsamiq.com/support/faqs/browserconsole/))
3. Copy the code in [watch-history-exporter-for-amazon-prime-video.js] and paste it into the console. If this doesn't
   work or you see a warning message about pasting, see the [FAQ].
4. Press enter to run the script. You should see the script running in the console and you'll be prompted to save a file
   when it finishes. If this doesn't happen, see the [FAQ].

### Columns

|                              Column | Description                                                                                                                       |
| ----------------------------------: | --------------------------------------------------------------------------------------------------------------------------------- |
|                    **Date Watched** | When the item was watched. Stored as a timestamp or formatted date, [depending on configuration](#date-formats).                  |
|                            **Type** | Whether the item is a movie or a series episode.                                                                                  |
|                           **Title** | The movie title or series name.                                                                                                   |
|                   **Episode Title** | The episode title (empty for movies).                                                                                             |
|         **Global Title Identifier** | Amazon’s internal unique identifier for the movie or series.                                                                      |
| **Episode Global Title Identifier** | Amazon’s internal unique identifier for the episode (empty for movies).                                                           |
|                            **Path** | Prime Video URL path for the movie or series. To get the full URL, prepend `https://www.primevideo.com` to this value.            |
|                    **Episode Path** | Prime Video URL path for the episode (empty for movies). To get the full URL, prepend `https://www.primevideo.com` to this value. |
|                       **Image URL** | URL of the poster or thumbnail image.                                                                                             |

## 🤖 Advanced Usage

There are several constants at the top of the script that can be used to tweak the script's behavior to suit your needs.

### Interactivity

By default, the script will prompt you when something goes awry so you can decide if you want to continue or not.

If you want to run the script programmatically or you don't care about warnings, you can change the `OPTION.interactive`
variable at the top of the script from `true` to `false` to automatically continue when warnings are displayed.

### Output Format

> [!NOTE]
> CSV files have human-readable column names, while JSON files have machine-readable property names.

By default, the output is saved as a CSV file. If you prefer JSON, change the `OPTION.outputJson` variable at the top of
the script from `false` to `true`.

JSON uses tabs to indent the output by default, but you can [change this](#custom-delimiters) to an empty string for a
smaller file size or spaces if you prefer those.

### Output Filename

> [!NOTE]
> The file extension will be added automatically.

By default, the output filename is `watch-history-export-<timestamp>`. You can change this by modifying the
`OPTION.outputFilename` variable at the top of the script.

### Date Formats

By default, dates and times are saved in an RFC 3339-like format like `yyyy-mm-dd hh:mm:ss.sss`. Dates in this format
are human-readable and easily understood by most spreadsheet programs.

If you plan on using the CSV data programmatically, you can instead output raw Unix Timestamps like `1759024824173`.
Note that this is in milliseconds.

To do this, change the `OPTION.formatDates` variable at the top of the script from `true` to `false`.

### Custom Delimiters

> [!NOTE]
> The default values were chosen because they are compatible and auto-detected by most spreadsheet programs. They have
> also been tested to make sure things like weird movie titles don't break the output. Changing delimiters has the
> potential to cause issues.

The `DELIMITERS` constant at the top of the file contains various delimiters used in the CSV file. By default, we use
`"` to separate strings, `,` to separate columns, and `\n` (newline) to separate rows. `\t` (tab) is used to separate
JSON objects when exporting as JSON. If you want to use different delimiters, you can customize the values here.

### Custom Column Names

The `MSG` constant at the top of the file contains column names and values. If you want the CSV to be in a different
language, you can customize these values.

Alternatively, you can use a text editor or spreadsheet program to rename the columns after the CSV is generated.

## 🛟 Support

Need help? See the [support resources](https://github.com/twocaretcat/.github/blob/main/docs/SUPPORT.md) for information
on how to:

- request features
- report bugs
- ask questions
- report security vulnerabilities

Some solutions to common issues are also listed below.

### FAQ

<details>
  <summary><b>Nothing shows up when I paste in the console / I get a warning when I try to paste in the console</b></summary><br/>

Some browsers prevent you from pasting code in the console because it could be malicious. This is called Paste
Protection and you can read more about it on the [Chrome for Developers Blog].

If this happens, follow the instructions in the console to re-enable pasting, and then try again. For Chrome, the
following steps should work:

1. Try to paste something in the console. You should get a warning message about pasting
2. Type "allow pasting" in the console and press enter

See [this video] for a visual walkthrough.

</details>

<details>
  <summary><b>I get an <code>Uncaught SyntaxError: Unexpected identifier</code> error when running the script</b></summary><br/>

Make sure that you select the entire file with <kbd>Ctrl</kbd> + <kbd>A</kbd> when copying it. If part of the script is
cut off, it won't work.

</details>

<details>
  <summary><b>The script runs, but I am not prompted to save a file</b></summary><br/>

If you have a default download folder set, check if the file is there.

Otherwise, make sure "Pop-ups and redirects" and "Automatic downloads" are enabled for <www.primevideo.com> in your
browser settings.

</details>

<details>
  <summary><b>Something else is broken</b></summary><br/>

If you can't get things working, you can try running an older version of the script. [v2.1.0](../../tree/v2.1.0) uses a
different method to export your watch history than the current version, so it may work if the current version doesn't.

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

Copyright © 2026 [John Goodliff](https://johng.io/r/watch-history-exporter-for-amazon-prime-video)
([@twocaretcat](https://github.com/twocaretcat)).

This project is released into the public domain (attribution is appreciated but not required 🙂). See the
[license](LICENSE) for details.

## 💕 Funding

Find this project useful? [Sponsoring me](https://johng.io/funding) will help me cover costs and **_commit_** more time
to open-source.

If you can't donate but still want to contribute, don't worry. There are many other ways to help out, like:

- 📢 reporting (submitting feature requests & bug reports)
- 👨‍💻 coding (implementing features & fixing bugs)
- 📝 writing (documenting & translating)
- 💬 spreading the word
- ⭐ starring the project

I appreciate the support!

[FAQ]: #faq
[watch-history-exporter-for-amazon-prime-video.js]: watch-history-exporter-for-amazon-prime-video.js
[primevideo.com/settings/watch-history]: https://www.primevideo.com/settings/watch-history
[Amazon Prime Video]: https://www.primevideo.com
[this video]: https://youtu.be/X5uyCtVD1-o?si=AOrzgez90KiDlA-z&t=11
[Chrome for Developers Blog]: https://developer.chrome.com/blog/self-xss
[ChatGPT]: https://chatgpt.com/
