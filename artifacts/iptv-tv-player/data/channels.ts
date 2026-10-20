export type Channel = {
  id: string;
  number: number;
  name: string;
  group: string;
  url: string;
};

const channelNames = [
  'TAP MOVIES',
  'TAP ACTION FLIX',
  'ROCK INTERTAINMENT',
  'TAP SPORTS',
  'TAP EDGE',
  'TAP PREMIER SPORTS',
  'PREMIER FOOTBALL',
  'ESPN',
  'ONE SPORTS',
  'TAP TV',
  'BBC WORLD',
  'FOX NEWS',
  'DISCOVERY CHANNEL',
  'ANIMAL PLANET',
  'HBO',
  'CINEMAX',
  'KAPAMILYA CHANNEL',
  'UFC-TV',
  'BLAST SPORTS',
  'TV5',
  'GMA-7',
  'ANC',
  'RPTV',
  'NICK JR',
  'CNN',
  'CARTOONITO',
  'PORMOSA',
  'PBO',
  'KBS WORLD',
  'CHANNEL V',
  'EWTN',
  'FIGHT SPORTS',
  'DREAMSWORKS',
  'CINEMA ONE',
  'WARNER TV',
  'UNTV',
  'HOPE CHANNEL',
  'COMIC-U',
  'PREMIER SPORTS-2',
  'EDGE SPORT',
  'HISTORY',
  'ONE NEWS',
  'CRIME INVESTIGATION',
  'ALL TV',
  'VIVA CINEMA',
  'TMC',
  'CMP',
  'AXN',
  'DZMM TELERADYO',
  'IBC-13',
  'ALJAZEERA',
  'SMNI',
  'UNIVERSAL STUDIO',
  'FASHION TV',
  'TLC',
  'OUTDOOR',
  'INCTV',
  'NET-25',
  'NBA TV PHILIPPINES',
  'NICKELODEON',
];

export const channels: Channel[] = channelNames.map((name, index) => {
  const number = index + 1;
  const thirdOctet = Math.floor(number / 10);
  const fourthOctet = number % 10;

  return {
    id: `channel-${number}`,
    number,
    name,
    group: 'GELOBOT TV',
    url: `udp://@232.100.${thirdOctet}.${fourthOctet}:${49000 + number}`,
  };
});
