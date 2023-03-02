export function throttle(callback, timer = 0) {
	let savedThis, savedArgs, isThrottled
	isThrottled = false

	return function() {
		savedArgs = arguments
		savedThis = this
		if (!isThrottled) {
			isThrottled = true
			setTimeout(() => {
				callback.apply(savedThis, savedArgs)
				isThrottled = false
			}, timer)
		}
	}
}