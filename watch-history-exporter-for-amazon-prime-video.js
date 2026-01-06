(async () => {
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

	/** Print an informational message to the console */
	const log = (msg, logFn = console.info, showPrefix = true) => {
		const prefixArray = showPrefix
			? ['%c[Watch History Exporter for Amazon Prime]', 'color:#1399FF;background:#00050d;font-weight:bold;']
			: [];

		logFn(...prefixArray, msg);
	};

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

		let isValid = false;

		for (const widget of widgets) {
			if (widget?.widgetType !== 'watch-history') continue;

			const dateSections = widget?.content?.content?.titles;

			if (Array.isArray(dateSections)) {
				processWatchHistoryItems(dateSections);

				isValid = true;
			}
		}

		return isValid;
	};

	/** Search the page for a script containing inline watch history data and process it */
	const findInlineWatchHistory = async () => {
		const scripts = Array.from(document.body.querySelectorAll('script[type="text/template"]'));
		const promises = scripts.map(async (script) => {
			const obj = JSON.parse(script.textContent.trim());
			const wasProcessed = processPotentialWatchHistoryResponse(obj?.props);

			if (!wasProcessed) throw new Error('Not processed');

			return true;
		});

		try {
			await Promise.any(promises);
			log('Found and processed inline watch history', console.info);
		} catch {
			log(
				'No valid inline watch history found (this is probably a bug). Some of the most recent watch history may be missing in the output. Skipping...',
				console.warn
			);
		}
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

	/** Download the watch history as a CSV file */
	const downloadCsv = () => {
		log('Saving CSV file...', console.group);
		log(
			'If you are not prompted to save a file, make sure "Pop-ups and redirects" and "Automatic downloads" are enabled for www.primevideo.com in your browser.',
			console.info,
			false
		);
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
