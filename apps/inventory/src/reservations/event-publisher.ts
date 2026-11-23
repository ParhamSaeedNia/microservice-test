export abstract class EventPublisher {
  abstract publish(topic: string, event: object): Promise<void>;
}
