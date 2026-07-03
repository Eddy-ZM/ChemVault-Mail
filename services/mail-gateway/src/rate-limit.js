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

export function createWindowRateLimiter({ windowMs = 60 * 1000, maxAttempts = 5 } = {}) {
	const buckets = new Map();
	return {
		check(key) {
			const now = Date.now();
			const bucket = buckets.get(key) || [];
			const fresh = bucket.filter((timestamp) => now - timestamp < windowMs);
			if (fresh.length >= maxAttempts) {
				buckets.set(key, fresh);
				return false;
			}
			fresh.push(now);
			buckets.set(key, fresh);
			return true;
		}
	};
}
