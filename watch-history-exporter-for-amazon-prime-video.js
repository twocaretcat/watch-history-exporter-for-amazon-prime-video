(async () => {
	/** When true, prompt the user to continue when warning messages are displayed. Otherwise, continue automatically */
	const INTERACTIVE = true;

	/** When true, format epoch ms into "yyyy-mm-dd hh:mm:ss.000". Otherwise, output the raw epoch milliseconds value */
	const FORMAT_DATES = true;

	/** Delimiters for the CSV file */
	const DELIMITER = {
		string: '"',
		field: ',',
		record: '\n',
	};

	/** Locale-specific strings and functions */
	const MSG = {
		dateWatched: 'Date Watched',
		episodeTitle: 'Episode',
		movie: 'Movie',
		series: 'Series',
		title: 'Title',
		type: 'Type',
	};

	/** A list of watch history items to be exported */
	const watchHistoryItems = [];

	/** Get the corresponding suffix for a log message given a continuation status */
	const getLogSuffix = (() => {
		const suffixMap = {
			true: ' Continuing...',
			false: ' Cancelling...',
			undefined: '',
		};

		return (doContinue) => [doContinue, suffixMap[doContinue]];
	})();

	/** Print an informational message to the console */
	const log = (msg, logFn = console.info, showPrefix = true) => {
		const prefix = '[Watch History Exporter for Amazon Prime]';
		const prefixArray = showPrefix ? [`%c${prefix}`, 'color:#1399FF;background:#00050d;font-weight:bold;'] : [];

		const [doContinue, suffix] = getLogSuffix(
			(() => {
				if (logFn !== console.warn) {
					return undefined;
				}

				if (INTERACTIVE) {
					return window.confirm(multiline(prefix, msg));
				}

				return true;
			})(),
		);

		logFn(...prefixArray, `${msg}${suffix}`);

		if (doContinue === false) {
			throw new Error('User cancelled execution');
		}
	};

	/** Join an array of strings with double newlines */
	const multiline = (...strs) => strs.join('\n\n');

	/** Decode HTML entities in an input string (ex. "&#34;", "&quot;", etc.) */
	const decodeHtmlEntities = (() => {
		const domParser = new DOMParser();

		return (str) => domParser.parseFromString(str, 'text/html').documentElement.textContent;
	})();

	/** Escape a string for CSV by decoding HTML entities, escaping delimiters, and wrapping in quotes */
	const escapeString = (str) => {
		const decoded = decodeHtmlEntities(str);
		const escaped = decoded.replaceAll(DELIMITER.string, `${DELIMITER.string}${DELIMITER.string}`);

		return [DELIMITER.string, escaped, DELIMITER.string].join('');
	};

	/** Format an epoch-milliseconds timestamp into "yyyy-mm-dd hh:mm:ss.sss" */
	const toDateTimeString = (ts) => new Date(ts).toISOString().slice(0, -1).split('T').join(' ');

	/** Loop through the watch history items and add them to the watchHistoryItems array */
	const processWatchHistoryItems = (dateSections) => {
		for (const dateSection of dateSections) {
			log(dateSection?.date, console.group, false);

			for (const itemsOfToday of dateSection.titles) {
				const title = itemsOfToday?.title?.text ?? itemsOfToday?.title ?? '';

				if (Array.isArray(itemsOfToday.children) && itemsOfToday.children.length > 0) {
					log(`[${MSG.series}] ${title}`, console.group, false);

					for (const episode of itemsOfToday.children) {
						const episodeTitle = episode?.title?.text;

						log(episodeTitle, console.info, false);

						const ts = episode?.time ?? itemsOfToday?.time ?? dateSection?.time;
						const formattedDate = FORMAT_DATES ? toDateTimeString(ts) : String(ts);

						watchHistoryItems.push([formattedDate, MSG.series, escapeString(title), escapeString(episodeTitle)]);
					}

					console.groupEnd();
				} else {
					log(`[${MSG.movie}] ${title}`, console.info, false);

					const ts = itemsOfToday?.time ?? dateSection?.time;
					const formattedDate = FORMAT_DATES ? toDateTimeString(ts) : String(ts);

					watchHistoryItems.push([formattedDate, MSG.movie, escapeString(title), '']);
				}
			}

			console.groupEnd();
		}
	};

	/** Processes the watch history items from the given object. Returns true if any watch-history widget was found and processed, otherwise false */
	const processPotentialWatchHistoryResponse = (obj) => {
		const widgets = obj?.widgets;

		if (!Array.isArray(widgets)) return false;

		let numOfItemsFound = 0;

		for (const widget of widgets) {
			if (widget?.widgetType !== 'watch-history') continue;

			const dateSections = widget?.content?.content?.titles;

			if (Array.isArray(dateSections)) {
				processWatchHistoryItems(dateSections);

				numOfItemsFound = dateSections.length;
			}
		}

		return numOfItemsFound;
	};

	/** Search the page for a script containing inline watch history data and process it */
	const findInlineWatchHistory = async () => {
		const scripts = Array.from(document.body.querySelectorAll('script[type="text/template"]'));

		let numOfItemsInJson = 0;

		for (const script of scripts) {
			const obj = JSON.parse(script.textContent.trim());

			numOfItemsInJson = processPotentialWatchHistoryResponse(obj?.props);

			if (!numOfItemsInJson) {
				continue;
			}

			const numOfItemsOnPage = [...document.querySelectorAll('[data-automation-id^="wh-date"]')].length;

			if (numOfItemsOnPage > numOfItemsInJson) {
				log(
					multiline(
						'It looks like some watch history items have already been loaded. This can be caused by scrolling down the page before running the script.',
						'To try again, click Cancel, reload the page, and run the script again.',
						'Alternatively, you can click OK to continue, but some items may be missing from the output.',
					),
					console.warn,
				);
			}

			break;
		}

		if (numOfItemsInJson) {
			log('Found and processed inline watch history', console.info);

			return;
		}

		log(
			multiline(
				'No valid inline watch history found (this is probably a bug).',
				'To try again, click Cancel, reload the page, and run the script again.',
				'Alternatively, you can click OK to continue, but some items may be missing from the output.',
			),
			console.warn,
		);
	};

	/** Clone a response and inspect it */
	const inspectResponse = async (response) => {
		const clonedResponse = response.clone();
		const contentType =
			(clonedResponse.headers && clonedResponse.headers.get && clonedResponse.headers.get('content-type')) || '';

		if (!contentType.includes('application/json')) return;

		const body = await clonedResponse.json();

		processPotentialWatchHistoryResponse(body);
	};

	/** Monkey-patch native fetch function so we can intercept responses and extract watch history data from them */
	const patchFetchFn = () => {
		const originalFetchFn = window.fetch;

		window.fetch = async (...args) => {
			const response = await originalFetchFn(...args);

			// No need to wait for this to complete
			inspectResponse(response);

			return response;
		};
	};

	/** Force lazy loading of the watch history by scrolling to the bottom of the page */
	const forceLoadWatchHistory = async () => {
		log('Loading watch history...');

		return new Promise((resolve) => {
			const autoScrollInterval = setInterval(() => {
				if (!document.body.querySelector('div[data-automation-id=activity-history-items] > div > noscript')) {
					clearInterval(autoScrollInterval);
					resolve();
				}

				window.scrollTo(0, document.body.scrollHeight);
			}, 500);
		});
	};

	/** Print a message to the console encouraging users to sponsor my work */
	const printSponsorMessage = () => {
		const bannerStyle = 'border:2px solid hotpink;padding:8px 12px;border-radius:6px;font-weight:700;font-size:12px;';
		const textStyle = 'font-size:12px;';

		console.log(
			'\n%c💖 If this script helped you save some time or effort, please consider sending $1 to support my work. Thanks :)',
			bannerStyle,
		);
		console.log(
			[
				'%c',
				'👉 GitHub:   https://github.com/sponsors/twocaretcat',
				'👉 Patreon:  https://patreon.com/twocaretcat',
				'👉 More:     https://johng.io/funding',
			].join('\n'),
			textStyle,
		);
	};

	/** Download the watch history as a CSV file */
	const downloadCsv = () => {
		log('Saving CSV file...', console.group);
		log(
			'💡 If you are not prompted to save a file, make sure "Pop-ups and redirects" and "Automatic downloads" are enabled for www.primevideo.com in your browser.',
			console.info,
			false,
		);
		printSponsorMessage();
		console.groupEnd();

		const columnNames = [MSG.dateWatched, MSG.type, MSG.title, MSG.episodeTitle].map(escapeString);
		const csvData = [columnNames, ...watchHistoryItems]
			.map((item) => item.join(DELIMITER.field))
			.join(DELIMITER.record);
		const csvDataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvData)}`;

		window.open(csvDataUrl);
	};

	// Script entry point
	log('Script started');

	await findInlineWatchHistory();

	patchFetchFn();

	await forceLoadWatchHistory();

	downloadCsv();
	log('Script finished');
})() && 'Script loaded';
