import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private jobs: { [key: string]: NodeJS.Timeout } = {};

  onModuleInit() {
    // اینجا می‌توانید وظایف زمان‌بندی شده را در زمان راه‌اندازی ماژول تنظیم کنید
  }

  scheduleJob(name: string, interval: number, task: () => void) {
    if (this.jobs[name]) {
      clearInterval(this.jobs[name]);
    }
    this.jobs[name] = setInterval(task, interval);
  }

  cancelJob(name: string) {
    if (this.jobs[name]) {
      clearInterval(this.jobs[name]);
      delete this.jobs[name];
    }
  }

  scheduleOnce(name: string, delay: number, task: () => void) {
    if (this.jobs[name]) {
      clearTimeout(this.jobs[name]);
    }
    this.jobs[name] = setTimeout(() => {
      task();
      delete this.jobs[name];
    }, delay);
  }
}
