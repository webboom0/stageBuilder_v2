import { Command } from '../Command.js';

class RemoveKeyframeCommand extends Command {

	/**
	 * @param {Editor} editor
	 * @param {string} objectId - 객체 ID (UUID)
	 * @param {string} property - 속성명 (position, rotation, scale 등)
	 * @param {number} time - 키프레임 시간
	 * @constructor
	 */
	constructor( editor, objectId = '', property = '', time = 0 ) {

		super( editor );

		this.type = 'RemoveKeyframeCommand';
		this.name = editor.strings.getKey( 'command/RemoveKeyframe' ) + ': ' + property;
		this.updatable = false;

		this.objectId = objectId;
		this.property = property;
		this.time = time;
		this.removedKeyframe = null;

	}

	execute() {

		console.log("🔄 RemoveKeyframeCommand.execute() 호출됨:", {
			objectId: this.objectId,
			property: this.property,
			time: this.time
		});

		// 키프레임 제거를 위한 시그널 발생 (실제 동작은 MotionTimeline에서 처리)
		if ( this.editor && this.editor.signals ) {
			// 키프레임 제거 요청 시그널 발생
			this.editor.signals.removeKeyframeRequested.dispatch({
				objectId: this.objectId,
				property: this.property,
				time: this.time
			});
			// 타임라인 UI 업데이트
			this.editor.signals.timelineChanged.dispatch();
		}

	}

	undo() {

		console.log("🔄 RemoveKeyframeCommand.undo() 호출됨:", {
			objectId: this.objectId,
			property: this.property,
			time: this.time
		});

		// 키프레임 복원을 위한 시그널만 발생 (실제 동작은 MotionTimeline에서 처리)
		if ( this.editor && this.editor.signals ) {
			// 키프레임 복원 요청 시그널 발생
			this.editor.signals.addKeyframeRequested.dispatch({
				objectId: this.objectId,
				property: this.property,
				time: this.time,
				value: this.removedKeyframe
			});
			// 타임라인 UI 업데이트
			this.editor.signals.timelineChanged.dispatch();
		}

	}

	// 이 메서드는 더 이상 사용하지 않음 (시그널 기반으로 변경)

	toJSON() {

		const output = super.toJSON( this );

		output.objectId = this.objectId;
		output.property = this.property;
		output.time = this.time;
		output.removedKeyframe = this.removedKeyframe;

		return output;

	}

	fromJSON( json ) {

		super.fromJSON( json );

		this.objectId = json.objectId;
		this.property = json.property;
		this.time = json.time;
		this.removedKeyframe = json.removedKeyframe;

	}

}

export { RemoveKeyframeCommand };
