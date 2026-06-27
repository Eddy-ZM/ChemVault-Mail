import { sqliteTable, text, integer} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const email = sqliteTable('email', {
	emailId: integer('email_id').primaryKey({ autoIncrement: true }),
	sendEmail: text('send_email'),
	name: text('name'),
	accountId: integer('account_id').notNull(),
	userId: integer('user_id').notNull(),
	subject: text('subject'),
	code: text('code').default('').notNull(),
	text: text('text'),
	content: text('content'),
	cc: text('cc').default('[]'),
	bcc: text('bcc').default('[]'),
	recipient: text('recipient'),
	toEmail: text('to_email').default('').notNull(),
	toName: text('to_name').default('').notNull(),
	inReplyTo: text('in_reply_to').default(''),
	relation: text('relation').default(''),
	messageId: text('message_id').default(''),
	type: integer('type').default(0).notNull(),
	status: integer('status').default(0).notNull(),
	resendEmailId: text('resend_email_id'),
	message: text('message'),
	headers: text('headers').default('{}').notNull(),
	attachmentsMetadata: text('attachments_metadata').default('[]').notNull(),
	mailboxPath: text('mailbox_path').default('').notNull(),
	rawEmlPath: text('raw_eml_path').default('').notNull(),
	receivedAt: text('received_at').default('').notNull(),
	unread: integer('unread').default(0).notNull(),
	createTime: text('create_time').default(sql`CURRENT_TIMESTAMP`).notNull(),
	isDel: integer('is_del').default(0).notNull()
});
export default email
