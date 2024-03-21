/* eslint-disable camelcase */

exports.up = (pgm) => {
	pgm.createTable('outstanding_data_messages', {
		id: 'id',
		created_at: {
			type: 'timestamp',
			notNull: true,
			default: pgm.func('current_timestamp'),
		},
		length: {
			type: 'integer',
			notNull: true,
		},
		num_clients: {
			type: 'integer',
			notNull: true,
		},
		// metadata
		tldraw_env: {
			type: 'varchar(255)',
			notNull: true,
		},
	})
	pgm.createIndex('outstanding_data_messages', 'created_at')
}
