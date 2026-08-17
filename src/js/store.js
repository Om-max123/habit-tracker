/**
 * MagicLoom Habit Tracker & Discipline System - Data Store
 * Single Source of Truth with Real-Time Cross-View Analytics & Lifetime Cloud Persistence.
 */

import { syncEngine } from './syncEngine.js';

const STORAGE_KEY = 'magicloom_lifetime_habit_data_v1';
const SECONDARY_BACKUP_KEY = 'magicloom_backup_state_v1';

// 10 Default Daily Habits
const DEFAULT_HABITS = [
  { id: 'h1', title: 'Wake up at 05:00', icon: '⏰', category: 'Routine', goalMonthly: 30 },
  { id: 'h2', title: 'No Reels', icon: '🚫', category: 'Discipline', goalMonthly: 30 },
  { id: 'h3', title: "Don't check her Inst...", icon: '💔', category: 'Mindset', goalMonthly: 30 },
  { id: 'h4', title: 'Phone outside bedroom', icon: '🔕', category: 'Discipline', goalMonthly: 30 },
  { id: 'h5', title: 'Gym & Workout', icon: '🏋️‍♂️', category: 'Health', goalMonthly: 25 },
  { id: 'h6', title: 'No Alcohol', icon: '🍺', category: 'Health', goalMonthly: 30 },
  { id: 'h7', title: 'Cold shower', icon: '🚿', category: 'Health', goalMonthly: 30 },
  { id: 'h8', title: 'Max 1h social media', icon: '📱', category: 'Discipline', goalMonthly: 30 },
  { id: 'h9', title: 'Budget tracking', icon: '💰', category: 'Productivity', goalMonthly: 30 },
  { id: 'h10', title: 'No complaining out loud', icon: '🤫', category: 'Mindset', goalMonthly: 30 }
];

function generateBlankMonthlyData(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const checks = {};
  const mood = {};
  const motivation = {};

  DEFAULT_HABITS.forEach(h => {
    checks[h.id] = {};
    for (let d = 1; d <= daysInMonth; d++) {
      checks[h.id][d] = false;
    }
  });

  for (let d = 1; d <= daysInMonth; d++) {
    mood[d] = 0;
    motivation[d] = 0;
  }

  return { checks, mood, motivation };
}

class Store {
  constructor() {
    this.state = this.loadState();
    setInterval(() => this.saveState(false), 10000);
  }

  getDefaultState() {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11
    
    return {
      currentYear,
      currentMonth,
      activeTab: 'monthly',
      theme: 'dark',
      habits: DEFAULT_HABITS,
      monthlyData: {
        [`${currentYear}-${currentMonth}`]: generateBlankMonthlyData(currentYear, currentMonth)
      },
      weeklyData: {
        tasks: {
          'Mon': [], 'Tue': [], 'Wed': [], 'Thu': [], 'Fri': [], 'Sat': [], 'Sun': []
        },
        notes: {
          'Mon': '', 'Tue': '', 'Wed': '', 'Thu': '', 'Fri': '', 'Sat': '', 'Sun': ''
        },
        improvements: {
          'Mon': '', 'Tue': '', 'Wed': '', 'Thu': '', 'Fri': '', 'Sat': '', 'Sun': ''
        },
        gratitude: {
          'Mon': '', 'Tue': '', 'Wed': '', 'Thu': '', 'Fri': '', 'Sat': '', 'Sun': ''
        }
      }
    };
  }

  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(SECONDARY_BACKUP_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...this.getDefaultState(), ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load saved state from localStorage:', e);
    }
    return this.getDefaultState();
  }

  saveState(pushToCloud = true) {
    try {
      const serialized = JSON.stringify(this.state);
      localStorage.setItem(STORAGE_KEY, serialized);
      localStorage.setItem(SECONDARY_BACKUP_KEY, serialized);

      if (pushToCloud && typeof syncEngine !== 'undefined') {
        syncEngine.pushToCloud();
      }
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }

  getYearMonthKey(year = this.state.currentYear, month = this.state.currentMonth) {
    return `${year}-${month}`;
  }

  getCurrentMonthlyData(year = this.state.currentYear, month = this.state.currentMonth) {
    const key = `${year}-${month}`;
    if (!this.state.monthlyData[key]) {
      this.state.monthlyData[key] = generateBlankMonthlyData(year, month);
      this.saveState();
    }
    return this.state.monthlyData[key];
  }

  toggleHabitCheck(habitId, dayNumber) {
    const data = this.getCurrentMonthlyData();
    if (!data.checks[habitId]) {
      data.checks[habitId] = {};
    }
    data.checks[habitId][dayNumber] = !data.checks[habitId][dayNumber];
    this.saveState();
  }

  setRating(type, dayNumber, value) {
    const data = this.getCurrentMonthlyData();
    const val = parseInt(value, 10);
    if (!isNaN(val) && val >= 0 && val <= 10) {
      if (type === 'mood') data.mood[dayNumber] = val;
      if (type === 'motivation') data.motivation[dayNumber] = val;
      this.saveState();
    }
  }

  getWeeklyHabitStats() {
    const year = this.state.currentYear;
    const month = this.state.currentMonth;
    const monthData = this.getCurrentMonthlyData(year, month);
    const habits = this.state.habits;

    const today = new Date();
    const dayOfWeek = today.getDay();
    const distanceToMon = (dayOfWeek + 6) % 7;
    const mondayDateObj = new Date(today);
    mondayDateObj.setDate(today.getDate() - distanceToMon);

    const weekDaysInfo = [];
    const dayKeys = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(mondayDateObj);
      d.setDate(mondayDateObj.getDate() + i);
      const isSameMonth = d.getFullYear() === year && d.getMonth() === month;
      weekDaysInfo.push({
        dayKey: dayKeys[i],
        dayNum: d.getDate(),
        isSameMonth,
        dateFormatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }

    let totalPossibleHabitsCheck = habits.length * 7;
    let totalHabitsDoneThisWeek = 0;

    const habitRowsStats = habits.map(h => {
      let habitDoneCount = 0;
      const dayChecks = weekDaysInfo.map(wd => {
        const isChecked = wd.isSameMonth && monthData.checks[h.id] && monthData.checks[h.id][wd.dayNum];
        if (isChecked) {
          habitDoneCount++;
          totalHabitsDoneThisWeek++;
        }
        return isChecked;
      });

      return {
        habitId: h.id,
        title: h.title,
        icon: h.icon,
        dayChecks,
        doneCount: habitDoneCount,
        pct: Math.round((habitDoneCount / 7) * 100)
      };
    });

    const overallWeeklyPct = totalPossibleHabitsCheck > 0 ? Math.round((totalHabitsDoneThisWeek / totalPossibleHabitsCheck) * 100) : 0;

    return {
      weekDaysInfo,
      habitRowsStats,
      totalPossibleHabitsCheck,
      totalHabitsDoneThisWeek,
      overallWeeklyPct
    };
  }

  getYearlyHabitStats(year = this.state.currentYear) {
    const habits = this.state.habits;
    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    let annualTotalTarget = 0;
    let annualTotalCompleted = 0;

    const monthlyBreakdown = MONTH_NAMES.map((monthName, monthIdx) => {
      const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
      const monthKey = `${year}-${monthIdx}`;
      const data = this.state.monthlyData[monthKey];

      let monthTarget = habits.length * daysInMonth;
      let monthCompleted = 0;

      if (data && data.checks) {
        habits.forEach(h => {
          for (let d = 1; d <= daysInMonth; d++) {
            if (data.checks[h.id] && data.checks[h.id][d]) {
              monthCompleted++;
            }
          }
        });
      }

      annualTotalTarget += monthTarget;
      annualTotalCompleted += monthCompleted;

      const pct = monthTarget > 0 ? Math.round((monthCompleted / monthTarget) * 100) : 0;

      return {
        monthName,
        monthIdx,
        daysInMonth,
        totalHabits: monthTarget,
        completed: monthCompleted,
        pct
      };
    });

    const annualPct = annualTotalTarget > 0 ? Math.round((annualTotalCompleted / annualTotalTarget) * 100) : 0;

    return {
      year,
      annualTotalTarget,
      annualTotalCompleted,
      annualPct,
      monthlyBreakdown
    };
  }

  addHabit(title, icon = '⭐️', category = 'General', goalMonthly = 30) {
    if (!title || !title.trim()) return null;
    const newHabit = {
      id: 'h_' + Date.now(),
      title: title.trim(),
      icon: icon.trim() || '⭐️',
      category: category || 'General',
      goalMonthly: parseInt(goalMonthly, 10) || 30
    };
    this.state.habits.push(newHabit);

    Object.keys(this.state.monthlyData).forEach(key => {
      const data = this.state.monthlyData[key];
      if (data && data.checks) {
        data.checks[newHabit.id] = {};
      }
    });

    this.saveState();
    return newHabit;
  }

  deleteHabit(habitId) {
    this.state.habits = this.state.habits.filter(h => h.id !== habitId);
    
    Object.keys(this.state.monthlyData).forEach(key => {
      const data = this.state.monthlyData[key];
      if (data && data.checks && data.checks[habitId]) {
        delete data.checks[habitId];
      }
    });

    this.saveState();
  }

  toggleTask(dayName, taskId) {
    const tasks = this.state.weeklyData.tasks[dayName];
    if (tasks) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        task.completed = !task.completed;
        this.saveState();
      }
    }
  }

  addWeeklyTask(dayName, text) {
    if (!text.trim()) return;
    if (!this.state.weeklyData.tasks[dayName]) {
      this.state.weeklyData.tasks[dayName] = [];
    }
    this.state.weeklyData.tasks[dayName].push({
      id: 't_' + Date.now(),
      text,
      completed: false
    });
    this.saveState();
  }

  saveWeeklyNote(type, dayName, text) {
    if (this.state.weeklyData[type]) {
      this.state.weeklyData[type][dayName] = text;
      this.saveState();
    }
  }

  clearAllData() {
    this.state = this.getDefaultState();
    this.saveState();
  }
}

export const store = new Store();
