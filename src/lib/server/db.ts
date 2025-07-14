import type { LiveStoreEvent } from '@livestore/livestore';
import { toTableName } from '@livestore/sync-electric';
import postgres from 'postgres';
// import { env } from '$env/dynamic/private';

export const makeDb = (storeId: string) => {
	const tableName = toTableName(storeId);

	// const sql = postgres(env.DB_CONNECTION_URL);
	const sql = postgres({
		database: 'electric',
		user: 'postgres',
		password: 'password',
		host: 'localhost'
	});

	const migrate = () =>
		sql`
    CREATE TABLE IF NOT EXISTS ${sql(tableName)} (
			"seqNum" INTEGER PRIMARY KEY,
      "parentSeqNum" INTEGER,
			"name" TEXT NOT NULL,
			"args" JSONB NOT NULL,
      "clientId" TEXT NOT NULL,
      "sessionId" TEXT NOT NULL
    );
	`;
	// -- schema_hash INTEGER NOT NULL,
	// -- created_at TEXT NOT NULL

	const createEvents = (events: ReadonlyArray<LiveStoreEvent.AnyEncodedGlobal>) =>
		sql`
		  INSERT INTO ${sql(tableName)}
			("seqNum", "parentSeqNum", "name", "args", "clientId", "sessionId")
		  VALUES ${sql(
				events.map((e) => [e.seqNum, e.parentSeqNum, e.name, e.args, e.clientId, e.sessionId])
			)}
		  ON CONFLICT ("seqNum") DO NOTHING
		`;

	return {
		migrate,
		createEvents,
		disconnect: () => sql.end()
	};
};
