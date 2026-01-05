(async () => {
	/** When true, format epoch ms into "yyyy-mm-dd hh:mm:ss.000". Otherwise, output the raw epoch milliseconds value */
	const FORMAT_DATES = true;

	/** Delimiters for the CSV file */
	const DELIMITER = {
		string: '"',
		field: ',',
		record: '\n',
	};

	const I18N_COMMON_ES = {
		date_watched: 'Fecha vista',
		episode_title: 'Episodio',
		movie: 'Película',
		series: 'Serie',
		title: 'Título',
		type: 'Tipo',
	};

	const I18N_COMMON_PT = {
		date_watched: 'Data assistida',
		episode_title: 'Episódio',
		movie: 'Filme',
		series: 'Série',
		title: 'Título',
		type: 'Tipo',
	};

	const I18N_COMMON_ZH = {
		date_watched: '觀看日期',
		episode_title: '集',
		movie: '電影',
		series: '劇集系列',
		title: '標題',
		type: '類型',
	};

	/** Locale-specific strings and functions */
	const I18N = {
		'de-de': {
			date_watched: 'Datum angesehen',
			episode_title: 'Folge',
			movie: 'Film',
			series: 'Serie',
			title: 'Titel',
			type: 'Typ',
		},
		'en-us': {
			date_watched: 'Date Watched',
			episode_title: 'Episode',
			movie: 'Movie',
			series: 'Series',
			title: 'Title',
			type: 'Type',
		},
		'es-419': I18N_COMMON_ES,
		'es-es': {
			...I18N_COMMON_ES,
			date_watched: 'Fecha de visualización',
		},
		'fr-fr': {
			date_watched: 'Date regardée',
			episode_title: 'Épisode',
			movie: 'Film',
			series: 'Série',
			title: 'Titre',
			type: 'Type',
		},
		'pt-br': I18N_COMMON_PT,
		'pt-pt': {
			...I18N_COMMON_PT,
			date_watched: 'Data de visualização',
		},
		'zh-cn': {
			...I18N_COMMON_ZH,
			series: '剧集系列',
		},
		'zh-tw': I18N_COMMON_ZH,
		'ja-jp': {
			date_watched: '視聴日',
			episode_title: 'エピソード',
			movie: '映画',
			series: 'シリーズ',
			title: 'タイトル',
			type: '種類',
		},
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
					log(`[${i18n.series}] ${title}`, console.group, false);

					for (const episode of itemsOfToday.children) {
						const episodeTitle = episode?.title?.text;

						log(episodeTitle, console.info, false);

						const ts = episode?.time ?? itemsOfToday?.time ?? dateSection?.time;
						const formattedDate = FORMAT_DATES ? toDateTimeString(ts) : String(ts);

						watchHistoryItems.push([formattedDate, i18n.series, escapeString(title), escapeString(episodeTitle)]);
					}

					console.groupEnd();
				} else {
					log(`[${i18n.movie}] ${title}`, console.info, false);

					const ts = itemsOfToday?.time ?? dateSection?.time;
					const formattedDate = FORMAT_DATES ? toDateTimeString(ts) : String(ts);

					watchHistoryItems.push([formattedDate, i18n.movie, escapeString(title), '']);
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

		const columnNames = [i18n.date_watched, i18n.type, i18n.title, i18n.episode_title].map(escapeString);
		const csvData = [columnNames, ...watchHistoryItems]
			.map((item) => item.join(DELIMITER.field))
			.join(DELIMITER.record);
		const csvDataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvData)}`;

		window.open(csvDataUrl);
	};

	// Script entry point
	log('Script started');

	const languageTag = document.documentElement.lang;

	let i18n = I18N[languageTag];

	if (!i18n) {
		log(`Language "${languageTag}" is not supported. The script may fail`, console.warn);

		i18n = I18N['en-us'];
	}

	await findInlineWatchHistory();

	patchFetchFn();

	await forceLoadWatchHistory();

	downloadCsv();
	log('Script finished');
})() && 'Script loaded';
