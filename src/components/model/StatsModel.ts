import { getUserStats, postUserStats } from './helpers/apiStats';
import { LoginData } from '../types/loginTypes';
import { Stats } from '../types/statsTypes';
import { WordPlusUserWord, Word, UserWordPlus } from '../types';

class StatsModel {
  // BOOK_________________________________________
  public async handleOnLearn({ optional }: WordPlusUserWord) {
    const stats = await this.getOrCreateUserStats();
    const dateToday = this.createDateStr();

    if (optional) {
      const { learned, learnDate } = optional;
      if (learned === 'yes') {
        const oldDate = this.createDateStr(learnDate);
        stats.optional.long[oldDate].learnedWords -= 1;
        // console.log('-1 из Изученных');
      } else {
        stats.optional.long[dateToday].learnedWords += 1;
        // console.log('+1 к Изученным, есть OPTIONAL');
      }
    } else {
      stats.optional.long[dateToday].learnedWords += 1;
      // console.log('+1 к Изученным, не было OPTIONAL');
    }

    const { id, token } = this.getStorageUserData();
    await postUserStats(id, token, stats);
  }

  public async handleOnDifficult({ optional }: WordPlusUserWord) {
    if (optional) {
      const { learned, learnDate } = optional;
      if (learned === 'yes') {
        const stats = await this.getOrCreateUserStats();
        const oldDate = this.createDateStr(learnDate);

        stats.optional.long[oldDate].learnedWords -= 1;
        // console.log('обработчик сложных - было Изученным -> -1');

        const { id, token } = this.getStorageUserData();
        await postUserStats(id, token, stats);
      }
      // else {
      //   console.log('без изменений - не было Изученным');
      // }
    }
    // else {
    //   console.log('без изменений - не было OPTIONAL');
    // }
  }

  // GAME_Phrases__________________________________
  public async postPhraseResults(correctArr: WordPlusUserWord[], wrongArr: WordPlusUserWord[]) {
    const user = localStorage.getItem('user');
    if (!user) return;

    const stats = await this.getOrCreateUserStats();
    const dateToday = this.createDateStr(); // today

    correctArr.forEach((word) => {
      const { optional, difficulty } = word;
      if (optional) {
        const { learned, games } = optional;
        const { total, wins } = games.phrase;

        if ((wins + 1) % 5 === 0 && difficulty === 'difficult' && learned === 'no') {
          stats.optional.long[dateToday].learnedWords += 1;
          // console.log('СТАТ: learned+1 СЛОЖНОЕ from correct');
        }
        if ((wins + 1) % 3 === 0 && difficulty !== 'difficult' && learned === 'no') {
          stats.optional.long[dateToday].learnedWords += 1;
          // console.log('СТАТ: learned+1 обычное  from correct');
        }
        if (total === 0) {
          stats.optional.today.phrase.newWords += 1;
          stats.optional.long[dateToday].newWords += 1;
          // console.log('СТАТ: NEW+1 from correct');
        }

        stats.optional.today.phrase.wins += 1;
        stats.optional.today.phrase.total += 1;
        // console.log('СТАТ: wins+1, total+1 from correct');
      } else {
        stats.optional.today.phrase.newWords += 1;
        stats.optional.long[dateToday].newWords += 1;

        stats.optional.today.phrase.wins += 1;
        stats.optional.today.phrase.total += 1;
        // console.log('СТАТ: Correct - не было OPTIONAL : wins+1, total+1, NEW+1');
      }
    });

    wrongArr.forEach((word) => {
      const { optional } = word;
      if (optional) {
        const { learned, learnDate, games } = optional;
        const { total } = games.phrase;

        if (learned === 'yes') {
          // console.log('СТАТ: learned -1 ИЗУЧЕННОЕ from wrongArr');
          const oldDate = this.createDateStr(learnDate);
          stats.optional.long[oldDate].learnedWords -= 1;
        }
        if (total === 0) {
          stats.optional.today.phrase.newWords += 1;
          stats.optional.long[dateToday].newWords += 1;
          // console.log('СТАТ: NEW+1 from wrongArr');
        }
        stats.optional.today.phrase.total += 1; // wins += 0
        // console.log('СТАТ: total+1 from wrongArr');
      } else {
        stats.optional.today.phrase.newWords += 1;
        stats.optional.long[dateToday].newWords += 1;

        stats.optional.today.phrase.total += 1; // wins += 0
        // console.log('СТАТ: Wrong - не было OPTIONAL : total+1, NEW+1');
      }
    });
    const max = Math.max(correctArr.length, stats.optional.today.phrase.bestSeries);
    stats.optional.today.phrase.bestSeries = max;

    const { id, token } = JSON.parse(user) as LoginData;
    await postUserStats(id, token, stats);
  }

  // GAMES_Sprint_Audio____________________________
  public async postWrong(word: Word | UserWordPlus) {
    const oldWord = word as UserWordPlus;
    const { optional } = oldWord;
    const { learnDate, learned, games } = optional;

    const newStats = await this.getOrCreateUserStats();

    if (learned === 'yes') {
      // console.log('СТАТ: МИНУС ИЗУЧЕННОЕ');
      const dateStr = this.createDateStr(learnDate); // oldDate
      newStats.optional.long[dateStr].learnedWords -= 1;
    }

    const game = window.location.hash.slice(1).split('#')[0] as 'sprint' | 'audio' | 'phrase';
    const { total } = games[game];

    let wordIsNew = true;
    if (total > 0) wordIsNew = false;

    if (wordIsNew) {
      const dateToday = this.createDateStr(); // today
      newStats.optional.today[game].newWords += 1;
      newStats.optional.long[dateToday].newWords += 1;
    }

    newStats.optional.today[game].total += 1; // wins += 0

    const { id, token } = this.getStorageUserData();
    await postUserStats(id, token, newStats);
  }

  public async postCorrect(word: Word | UserWordPlus) {
    const oldWord = word as UserWordPlus;
    const { optional, difficulty } = oldWord;
    const { games, learned } = optional;

    const dateToday = this.createDateStr(); // today
    const newStats = await this.getOrCreateUserStats();

    const game = window.location.hash.slice(1).split('#')[0] as 'sprint' | 'audio' | 'phrase';
    const { total, wins } = games[game];

    if ((wins + 1) % 5 === 0 && difficulty === 'difficult' && learned === 'no') {
      newStats.optional.long[dateToday].learnedWords += 1; // Learned
      // console.log('СТАТ: ИЗУЧЕНО СЛОЖНОЕ');
    }
    if ((wins + 1) % 3 === 0 && difficulty !== 'difficult' && learned === 'no') {
      newStats.optional.long[dateToday].learnedWords += 1; // Learned
      // console.log('СТАТ: ИЗУЧЕНО обычное');
    }

    let wordIsNew = true;
    if (total > 0) wordIsNew = false;

    if (wordIsNew) {
      newStats.optional.today[game].newWords += 1;
      newStats.optional.long[dateToday].newWords += 1;
    }

    newStats.optional.today[game].wins += 1;
    newStats.optional.today[game].total += 1;

    const { id, token } = this.getStorageUserData();
    await postUserStats(id, token, newStats);
  }

  public async postBestSeries(num: number) {
    const userJSON = localStorage.getItem('user');
    if (!userJSON) return;

    const stats = await this.getOrCreateUserStats();

    stats.optional.dateToday = this.createDateStr();
    const [game] = window.location.hash.slice(1).split('#');

    const max = Math.max(num, stats.optional.today[game].bestSeries);
    stats.optional.today[game].bestSeries = max;

    const { id, token } = this.getStorageUserData();
    // console.log('лучшая серия', num);

    await postUserStats(id, token, stats);
  }

  // PRIVATE_______________________________________
  private createDateStr(timestamp?: number) {
    let date: Date;
    if (timestamp) {
      date = new Date(timestamp);
    } else {
      date = new Date();
    }
    const year = `${date.getFullYear()}`.slice(2);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dateKey = `${day}.${month}.${year}`;
    return dateKey;
  }

  private createDefaultStatsObj() {
    const dateStrToday = this.createDateStr();

    const defaultStats = {
      learnedWords: 0,
      optional: {
        dateToday: dateStrToday,
        today: {
          sprint: { newWords: 0, bestSeries: 0, wins: 0, total: 0 },
          audio: { newWords: 0, bestSeries: 0, wins: 0, total: 0 },
          phrase: { newWords: 0, bestSeries: 0, wins: 0, total: 0 },
        },
        long: {
          [dateStrToday]: { newWords: 0, learnedWords: 0 },
        },
      },
    };

    return defaultStats;
  }

  private getStorageUserData() {
    const userJSON = localStorage.getItem('user');
    const user = JSON.parse(`${userJSON}`) as LoginData;
    return user;
  }

  private async getOrCreateUserStats() {
    const { id, token } = this.getStorageUserData();
    const { stats } = await getUserStats(id, token);
    let newStats: Stats;
    if (stats) {
      newStats = stats;
      this.checkDateToDropDayStats(newStats);
      delete newStats.id;
    } else {
      newStats = this.createDefaultStatsObj();
    }

    return newStats;
  }

  private checkDateToDropDayStats(obj: Stats) {
    const stats = obj;
    const today = this.createDateStr();
    if (stats.optional.dateToday !== today) {
      stats.optional.today.sprint = { newWords: 0, bestSeries: 0, wins: 0, total: 0 };
      stats.optional.today.audio = { newWords: 0, bestSeries: 0, wins: 0, total: 0 };
      stats.optional.today.phrase = { newWords: 0, bestSeries: 0, wins: 0, total: 0 };
      stats.optional.long[today] = { newWords: 0, learnedWords: 0 };
      stats.optional.dateToday = today;
    }
  }
  // StatsView_______________________________________
  public async getStats() {
    const stats = await this.getOrCreateUserStats();
    return stats;
  }

  public getDefaultStats() {
    return this.createDefaultStatsObj();
  }
}

export const statsModel = new StatsModel();
