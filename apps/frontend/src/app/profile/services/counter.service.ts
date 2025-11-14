import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CounterService {
    
  animateCounter(
    targetValue: number, 
    duration = 2000, 
    startValue = 0
  ): Observable<number> {
    const subject = new BehaviorSubject<number>(startValue);
    
    if (targetValue === startValue) {
      subject.next(targetValue);
      subject.complete();
      return subject.asObservable();
    }

    const startTime = Date.now();
    const difference = targetValue - startValue;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(startValue + (difference * easedProgress));
      
      subject.next(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        subject.next(targetValue);
        subject.complete();
      }
    };
    
    requestAnimationFrame(animate);
    return subject.asObservable();
  }

  animatePercentage(
    targetValue: number, 
    duration = 2000
  ): Observable<number> {
    return this.animateCounter(targetValue, duration, 0);
  }

  animateMultipleCounters(
    values: number[], 
    duration = 2000, 
    staggerDelay = 200
  ): Observable<number>[] {
    return values.map((value, index) => {
      const delay = index * staggerDelay;
      return new Observable<number>(observer => {
        setTimeout(() => {
          this.animateCounter(value, duration).subscribe(observer);
        }, delay);
      });
    });
  }
}
