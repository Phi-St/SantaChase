{

const TouchInput_onMouseMove = TouchInput._onMouseMove
TouchInput._onMouseMove = function(event) {
    if($gameVariables ){
	$gameVariables.setValue(99, Graphics.pageToCanvasX(event.pageX))
    	$gameVariables.setValue(100, Graphics.pageToCanvasX(event.pageY))
    }
    TouchInput_onMouseMove.call(this, event)
}

}