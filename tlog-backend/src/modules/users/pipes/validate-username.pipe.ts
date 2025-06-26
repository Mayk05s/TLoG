import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isNotEmpty, isString, matches } from 'class-validator';

@Injectable()
export class ValidateUsernamePipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isString(value)) {
      throw new BadRequestException('Username must be a string');
    }

    const trimmedValue = value.trim();

    if (!isNotEmpty(trimmedValue)) {
      throw new BadRequestException('Username cannot be empty');
    }

    if (trimmedValue.length < 3) {
      throw new BadRequestException('Username must be at least 3 characters long');
    }

    if (trimmedValue.length > 20) {
      throw new BadRequestException('Username must be at most 20 characters long');
    }

    if (!matches(trimmedValue, /^[a-zA-Z0-9_-]+$/)) {
      throw new BadRequestException(
        'Username can only contain letters, numbers, underscores, and hyphens',
      );
    }

    return trimmedValue;
  }
}
