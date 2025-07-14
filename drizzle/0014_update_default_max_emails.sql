-- 更新现有用户的默认邮箱数量限制为0（平民用户不可创建邮箱）
UPDATE `user` SET `max_emails` = 0 WHERE `max_emails` IS NULL OR `max_emails` = 30 OR `max_emails` = 1;
