export function createLoginRateLimiter({ windowMs = 15 * 60 * 1000, maxAttempts = 8 } = {}) {
	const buckets = new Map();
	return {
		check(key) {
			const now = Date.now();
			const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };
			if (bucket.resetAt <= now) {
				bucket.count = 0;
				bucket.resetAt = now + windowMs;
			}
			if (bucket.count >= maxAttempts) {
				return false;
			}
			return true;
		},
		recordFailure(key) {
			const now = Date.now();
			const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };
			if (bucket.resetAt <= now) {
				bucket.count = 0;
				bucket.resetAt = now + windowMs;
			}
			bucket.count += 1;
			buckets.set(key, bucket);
		},
		recordSuccess(key) {
			buckets.delete(key);
		}
	};
}
