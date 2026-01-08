(async () => {
	/** Configurable options */
	const OPTION = {
		/** When true, prompt the user to continue when warning messages are displayed. Otherwise, continue automatically */
		interactive: true,
		/** When true, save the output as JSON. Otherwise, save it as CSV */
		outputJson: false,
		/** When true, format epoch ms into "yyyy-mm-dd hh:mm:ss.000". Otherwise, output the raw epoch milliseconds value */
		formatDates: true,
	};

	/** Delimiters for the CSV file */
	const DELIMITER = {
		string: '"',
		field: ',',
		record: '\n',
		json: '\t',
	};

	/** Locale-specific strings and functions */
	const MSG = {
		column: {
			dateWatched: 'Date Watched',
			type: 'Type',
			title: 'Title',
			episodeTitle: 'Episode Title',
			gti: 'Global Title Identifier',
			episodeGti: 'Episode Global Title Identifier',
			path: 'Path',
			episodePath: 'Episode Path',
			imageUrl: 'Image URL',
		},
		value: {
			movie: 'Movie',
			series: 'Series',
		},
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

				if (OPTION.interactive) {
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

	/** Escape a value for CSV by converting it to a string, escaping delimiters, and wrapping in quotes */
	const csvEscape = (value) =>
		[
			DELIMITER.string,
			String(value).replaceAll(DELIMITER.string, `${DELIMITER.string}${DELIMITER.string}`),
			DELIMITER.string,
		].join('');

	/** If `OPTION.formatDates` is true, format an epoch-milliseconds timestamp as "yyyy-mm-dd hh:mm:ss.sss", otherwise return the timestamp as a string */
	const toDateTimeString = (ts) =>
		OPTION.formatDates ? new Date(ts).toISOString().slice(0, -1).split('T').join(' ') : ts;

	/** Loop through the watch history items and add them to the watchHistoryItems array */
	const processWatchHistoryItems = (dateSections) => {
		for (const dateSection of dateSections) {
			log(dateSection?.date, console.group, false);

			for (const itemOfToday of dateSection.titles) {
				const title = decodeHtmlEntities(itemOfToday?.title?.text);
				const id = itemOfToday?.gti;
				const path = itemOfToday?.title?.href;
				const imageUrl = itemOfToday?.imageSrc;

				if (Array.isArray(itemOfToday.children) && itemOfToday.children.length > 0) {
					const type = MSG.value.series;

					log(`[${type}] ${title}`, console.group, false);

					for (const episode of itemOfToday.children) {
						const episodeTitle = decodeHtmlEntities(episode?.title?.text);

						log(episodeTitle, console.info, false);

						watchHistoryItems.push({
							dateWatched: toDateTimeString(episode?.time),
							type,
							title,
							episodeTitle: episodeTitle,
							id,
							episodeId: episode?.gti,
							path,
							episodePath: episode?.title?.href,
							imageUrl,
						});
					}

					console.groupEnd();

					continue;
				}

				const type = MSG.value.movie;

				log(`[${type}] ${title}`, console.info, false);

				watchHistoryItems.push({
					dateWatched: toDateTimeString(itemOfToday?.time),
					type,
					title,
					episodeTitle: '',
					id,
					episodeId: '',
					path,
					episodePath: '',
					imageUrl,
				});
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
			'\n%c💖 If this script saved you some time or effort, please consider donating $1 to support my work. Thanks :)',
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

	/** Encode the watch history as CSV */
	const encodeAsCsv = () => {
		const columnNames = Object.values(MSG.column).map(csvEscape);
		const rows = watchHistoryItems.map((watchHistoryItem) => Object.values(watchHistoryItem).map(csvEscape));

		return ['csv', 'text/csv', [columnNames, ...rows].map((item) => item.join(DELIMITER.field)).join(DELIMITER.record)];
	};

	/** Encode the watch history as JSON */
	const encodeAsJson = () => ['json', 'application/json', JSON.stringify(watchHistoryItems, null, DELIMITER.json)];

	/** Download the watch history as a CSV or JSON file */
	const downloadFile = () => {
		log(`Saving ${OPTION.outputJson ? 'JSON' : 'CSV'} file...`, console.group);
		log(
			'💡 If you are not prompted to save a file, make sure "Pop-ups and redirects" and "Automatic downloads" are enabled for www.primevideo.com in your browser.',
			console.info,
			false,
		);
		printSponsorMessage();
		console.groupEnd();

		const [extension, mimeType, data] = OPTION.outputJson ? encodeAsJson() : encodeAsCsv();
		const blob = new Blob([data], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');

		a.href = url;
		a.download = `watch-history-export-${Date.now()}.${extension}`;

		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	// Script entry point
	log('Script started');

	await findInlineWatchHistory();

	patchFetchFn();

	await forceLoadWatchHistory();

	downloadFile();
	log('Script finished');
})() && 'Script loaded';
