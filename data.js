/* Adhkar content.
   Arabic: 112-114 from the Quran.com screenshots supplied by the user; 2:255 as pasted by the user;
   2:285-286 from surahquran.com / Quran.com. Duas: Hisn al-Muslim (sunnah.com).
   Translations of 2:255 and 2:285-286: Dr. Mustafa Khattab, The Clear Quran (Quran.com). */

const BISM = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';

const ITEMS = {
  kursi: {
    id: 'kursi',
    start: 255,
    title: 'Ayat al-Kursi',
    ref: 'Quran 2:255',
    arabic:
      'ٱللَّهُ لَآ إِلَـٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ ۚ لَا تَأْخُذُهُۥ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُۥ مَا فِى ٱلسَّمَـٰوَٰتِ وَمَا فِى ٱلْأَرْضِ ۗ مَن ذَا ٱلَّذِى يَشْفَعُ عِندَهُۥٓ إِلَّا بِإِذْنِهِۦ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَىْءٍ مِّنْ عِلْمِهِۦٓ إِلَّا بِمَا شَآءَ ۚ وَسِعَ كُرْسِيُّهُ ٱلسَّمَـٰوَٰتِ وَٱلْأَرْضَ ۖ وَلَا يَـُٔودُهُۥ حِفْظُهُمَا ۚ وَهُوَ ٱلْعَلِىُّ ٱلْعَظِيمُ',
    translation:
      'Allah! There is no god ˹worthy of worship˺ except Him, the Ever-Living, All-Sustaining. Neither drowsiness nor sleep overtakes Him. To Him belongs whatever is in the heavens and whatever is on the earth. Who could possibly intercede with Him without His permission? He ˹fully˺ knows what is ahead of them and what is behind them, but no one can grasp any of His knowledge—except what He wills ˹to reveal˺. His Seat encompasses the heavens and the earth, and the preservation of both does not tire Him. For He is the Most High, the Greatest.',
    count: 1,
  },
  ikhlas: {
    id: 'ikhlas',
    start: 1,
    title: 'Surah Al-Ikhlas',
    ref: 'Quran 112 · Hisn al-Muslim 76',
    bism: true,
    arabic:
      'قُلْ هُوَ ٱللَّهُ أَحَدٌ ۝ ٱللَّهُ ٱلصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌ',
    translation:
      'Say, ˹O Prophet,˺ “He is Allah—One ˹and Indivisible˺; Allah—the Sustainer ˹needed by all˺. He has never had offspring, nor was He born. And there is none comparable to Him.”',
    count: 3,
  },
  falaq: {
    id: 'falaq',
    start: 1,
    title: 'Surah Al-Falaq',
    ref: 'Quran 113 · Hisn al-Muslim 76',
    bism: true,
    arabic:
      'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ ۝ مِن شَرِّ مَا خَلَقَ ۝ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِن شَرِّ ٱلنَّفَّـٰثَـٰتِ فِى ٱلْعُقَدِ ۝ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ',
    translation:
      'Say, “I seek refuge in the Lord of the daybreak from the evil of whatever He has created, the evil of the darkness when it falls, the evil of those ˹witches˺ who blow onto knots, and the evil of the envious when they envy.”',
    count: 3,
  },
  nas: {
    id: 'nas',
    start: 1,
    title: 'Surah An-Nas',
    ref: 'Quran 114 · Hisn al-Muslim 76',
    bism: true,
    arabic:
      'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ ۝ مَلِكِ ٱلنَّاسِ ۝ إِلَـٰهِ ٱلنَّاسِ ۝ مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ ۝ ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ ۝ مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ',
    translation:
      'Say, “I seek refuge in the Lord of humankind, the King of humankind, the God of humankind, from the evil of the lurking whisperer—who whispers in the hearts of humankind—from among jinn and humankind.”',
    count: 3,
  },
  baqarah2: {
    id: 'baqarah2',
    start: 285,
    title: 'Last two verses of Al-Baqarah',
    ref: 'Quran 2:285–286 · Bukhari & Muslim (Abu Mas‘ud)',
    arabic:
      'آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِّن رُّسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ ۝ لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا ۚ رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِن قَبْلِنَا ۚ رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ ۖ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا ۚ أَنتَ مَوْلَانَا فَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ',
    translation:
      'The Messenger ˹firmly˺ believes in what has been revealed to him from his Lord, and so do the believers. They ˹all˺ believe in Allah, His angels, His Books, and His messengers. ˹They proclaim,˺ “We make no distinction between any of His messengers.” And they say, “We hear and obey. ˹We seek˺ Your forgiveness, our Lord! And to You ˹alone˺ is the final return.” Allah does not require of any soul more than what it can afford. All good will be for its own benefit, and all evil will be to its own loss. ˹The believers pray,˺ “Our Lord! Do not punish us if we forget or make a mistake. Our Lord! Do not place a burden on us like the one you placed on those before us. Our Lord! Do not burden us with what we cannot bear. Pardon us, forgive us, and have mercy on us. You are our ˹only˺ Guardian. So grant us victory over the disbelieving people.”',
    count: 1,
  },
  bismillahDua: {
    id: 'bismillahDua',
    title: 'Dua for protection from harm',
    ref: 'Abu Dawud, Tirmidhi 3388, Ibn Majah 3869 · Hisn al-Muslim 86',
    arabic:
      'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    translit:
      'Bismillāhi ‘l-ladhī lā yaḍurru ma‘a-smihi shay’un fil-’arḍi wa lā fis-samā’, wa huwas-Samī‘ul-‘Alīm.',
    translation:
      'In the name of Allah, with whose name nothing on earth or in heaven can cause harm, and He is the All-Hearing, the All-Knowing.',
    count: 3,
  },
  audhu: {
    id: 'audhu',
    title: 'Seeking refuge in Allah’s perfect words',
    ref: 'Muslim · Tirmidhi · Hisn al-Muslim 97 (said in the evening)',
    arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
    translit: 'A‘ūdhu bikalimāti-llāhit-tāmmāti min sharri mā khalaq.',
    translation:
      'I seek refuge in the perfect words of Allah from the evil of what He has created.',
    count: 3,
  },
};

const LISTS = {
  morning: ['kursi', 'ikhlas', 'falaq', 'nas', 'baqarah2', 'bismillahDua'],
  // Hisn al-Muslim (97) gives the “perfect words” dua as an evening dhikr.
  evening: ['kursi', 'ikhlas', 'falaq', 'nas', 'baqarah2', 'bismillahDua', 'audhu'],
  sleep: ['kursi', 'ikhlas', 'falaq', 'nas', 'baqarah2'],
};

const PRAYERS = [
  ['fajr', 'Fajr'],
  ['dhuhr', 'Dhuhr'],
  ['asr', 'Asr'],
  ['maghrib', 'Maghrib'],
  ['isha', 'Isha'],
];
