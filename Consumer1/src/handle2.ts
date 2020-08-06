import { Kafka } from "kafkajs";
import { EachMessagePayload } from "kafkajs";
import ip from "ip";

const errorTypes: string[] = ["unhandledRejection", "uncaughtException"];
const signalTraps: NodeJS.Signals[] = ["SIGTERM", "SIGINT", "SIGUSR2"];
const host: string = process.env.HOST_IP || ip.address();

const broker: string =
  process.env.KAFKA_BROKER === undefined
    ? `${host}:9092`
    : process.env.KAFKA_BROKER;

const kafka = new Kafka({
  logLevel: 4, //(process.env.KAFKA_LOGLEVEL as unknown) as logLevel,
  brokers: [broker],
  clientId: "bunkerdb",
});

//Cliente -> Grupo de Consumers -> Consumer -> Topic -> Partition [UNICO]
const topic: string = "local.db_consumers.brand";
const consumer = kafka.consumer({ groupId: "test_2" });

const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: topic, fromBeginning: true });
  await consumer.run({
    // eachBatch: async ({ batch }) => {
    //   console.log(batch)
    // },
    eachMessage: async (payload: EachMessagePayload) => {
      const prefix = `${topic}[${payload.partition} | ${payload.message.offset}] / ${payload.message.timestamp}`;
      console.log(
        `- ${prefix} ${payload.message.key}#${payload.message.value}`
      );
      //POST MS
    },
  });
};

run().catch((e) => console.error(`[ERROR] ${e.message}`, e));

errorTypes.map((type: string) => {
  process.on(type, async (e) => {
    try {
      console.log(`process.on ${type}`);
      console.error(e);
      await consumer.disconnect();
      process.exit(0);
    } catch (_) {
      process.exit(1);
    }
  });
});

signalTraps.map((type: NodeJS.Signals) => {
  process.once(type, async () => {
    try {
      await consumer.disconnect();
    } finally {
      process.kill(process.pid, type);
    }
  });
});
