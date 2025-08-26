import { Command } from '../Command.js';

class AddKeyframeCommand extends Command {

	/**
	 * @param {Editor} editor
	 * @param {string} objectId - 객체 ID (UUID)
	 * @param {string} property - 속성명 (position, rotation, scale 등)
	 * @param {number} time - 키프레임 시간
	 * @param {Object} value - 키프레임 값
	 * @constructor
	 */
	constructor( editor, objectId = '', property = '', time = 0, value = null ) {

		super( editor );

		this.type = 'AddKeyframeCommand';
		this.name = editor.strings.getKey( 'command/AddKeyframe' ) + ': ' + property;
		this.updatable = false;

		this.objectId = objectId;
		this.property = property;
		this.time = time;
		this.value = value;
		this.oldValue = null;
		this.oldKeyframe = null;

	}

	execute() {

		console.log("🔄 AddKeyframeCommand.execute() 호출됨:", {
			objectId: this.objectId,
			property: this.property,
			time: this.time,
			value: this.value
		});

		// 키프레임 추가를 위한 시그널 발생 (실제 동작은 MotionTimeline에서 처리)
		if ( this.editor && this.editor.signals ) {
			// 키프레임 추가 요청 시그널 발생
			this.editor.signals.addKeyframeRequested.dispatch({
				objectId: this.objectId,
				property: this.property,
				time: this.time,
				value: this.value
			});
			// 타임라인 UI 업데이트
			this.editor.signals.timelineChanged.dispatch();
		}

	}

	undo() {

		console.log("🔄 AddKeyframeCommand.undo() 호출됨:", {
			objectId: this.objectId,
			property: this.property,
			time: this.time,
			value: this.value
		});

		// 키프레임 제거를 위한 시그널만 발생 (실제 동작은 MotionTimeline에서 처리)
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

	// 이 메서드는 더 이상 사용하지 않음 (시그널 기반으로 변경)

	toJSON() {

		const output = super.toJSON( this );

		output.objectId = this.objectId;
		output.property = this.property;
		output.time = this.time;
		output.value = this.value;
		output.oldValue = this.oldValue;
		output.oldKeyframe = this.oldKeyframe;

		return output;

	}

	fromJSON( json ) {

		super.fromJSON( json );

		this.objectId = json.objectId;
		this.property = json.property;
		this.time = json.time;
		this.value = json.value;
		this.oldValue = json.oldValue;
		this.oldKeyframe = json.oldKeyframe;

	}

}

export { AddKeyframeCommand };
