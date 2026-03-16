import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World! My name is Viet Vo from Code Leap. I am DevOps Engineer';
  }
}
