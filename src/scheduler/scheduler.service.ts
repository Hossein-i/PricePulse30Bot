import { Injectable, OnModuleInit } from '@nestjs/common';

/**
 * SchedulerService is responsible for scheduling and managing jobs.
 * It allows scheduling recurring jobs, one-time jobs, and canceling jobs.
 */
@Injectable()
export class SchedulerService implements OnModuleInit {
  /**
   * A record that maps job identifiers to their corresponding NodeJS.Timeout objects.
   * This is used to keep track of scheduled jobs and their timeouts.
   */
  private jobs: Record<string, NodeJS.Timeout> = {};

  /**
   * Lifecycle hook that is called when the module has been initialized.
   */
  onModuleInit() {}

  /**
   * Schedules a recurring job.
   *
   * @param name The name of the job.
   * @param interval The interval in milliseconds at which the job should run.
   * @param task The task to be executed.
   */
  scheduleJob(name: string, interval: number, task: () => void) {
    if (this.jobs[name]) {
      clearInterval(this.jobs[name]);
    }
    this.jobs[name] = setInterval(task, interval);
  }

  /**
   * Cancels a scheduled job.
   *
   * @param name The name of the job to cancel.
   */
  cancelJob(name: string) {
    if (this.jobs[name]) {
      clearInterval(this.jobs[name]);
      delete this.jobs[name];
    }
  }

  /**
   * Schedules a one-time job.
   *
   * @param name The name of the job.
   * @param delay The delay in milliseconds after which the job should run.
   * @param task The task to be executed.
   */
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
