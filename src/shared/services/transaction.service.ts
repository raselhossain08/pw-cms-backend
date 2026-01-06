import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ClientSession } from 'mongoose';

/**
 * Transaction manager service for handling database transactions
 * Ensures data consistency across multiple operations
 */
@Injectable()
export class TransactionService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  /**
   * Execute operations within a transaction
   * Automatically commits on success or aborts on error
   */
  async executeInTransaction<T>(
    operation: (session: ClientSession) => Promise<T>,
  ): Promise<T> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const result = await operation(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Execute multiple purchase enrollments in a single transaction
   * Ensures all-or-nothing enrollment creation
   */
  async createPurchaseEnrollmentsTransaction(
    enrollmentOperations: Array<() => Promise<any>>,
  ): Promise<{ success: boolean; results: any[]; errors: string[] }> {
    const session = await this.connection.startSession();
    session.startTransaction();

    const results: any[] = [];
    const errors: string[] = [];

    try {
      for (const operation of enrollmentOperations) {
        try {
          const result = await operation();
          results.push(result);
        } catch (error) {
          errors.push(error.message || 'Operation failed');
          throw error; // Abort transaction on any error
        }
      }

      await session.commitTransaction();
      return { success: true, results, errors: [] };
    } catch (error) {
      await session.abortTransaction();
      return {
        success: false,
        results: [],
        errors: errors.length > 0 ? errors : [error.message],
      };
    } finally {
      session.endSession();
    }
  }
}
