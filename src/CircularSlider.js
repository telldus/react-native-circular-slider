import React, { PureComponent } from 'react';
import { PanResponder, View } from 'react-native';
import Svg, { Circle, G, LinearGradient, Path, Defs, Stop } from 'react-native-svg';
import range from 'lodash.range';
import { interpolateHcl as interpolateGradient } from 'd3-interpolate';
import ClockFace from './ClockFace';
import PropTypes from 'prop-types'; // ES6


function calculateArcColor(index0, segments, gradientColorFrom, gradientColorTo) {
const interpolate = interpolateGradient(gradientColorFrom, gradientColorTo);

return {
fromColor: interpolate(index0 / segments),
toColor: interpolate((index0 + 1) / segments),
}
}

function calculateArcCircle(index0, segments, radius, startAngle0 = 0, angleLength0 = 2 * Math.PI) {
// Add 0.0001 to the possible angle so when start = stop angle, whole circle is drawn
const startAngle = startAngle0 % (2 * Math.PI);
const angleLength = angleLength0 % (2 * Math.PI);
const index = index0 + 1;
const fromAngle = angleLength / segments * (index - 1) + startAngle;
const toAngle = angleLength / segments * index + startAngle;
const fromX = radius * Math.sin(fromAngle);
const fromY = -radius * Math.cos(fromAngle);
const realToX = radius * Math.sin(toAngle);
const realToY = -radius * Math.cos(toAngle);

// add 0.005 to start drawing a little bit earlier so segments stick together
const toX = radius * Math.sin(toAngle + 0.005);
const toY = -radius * Math.cos(toAngle + 0.005);

return {
fromX,
fromY,
toX,
toY,
realToX,
realToY,
};
}

function getGradientId(index) {
 return `gradient${index}`;
}

export default class CircularSlider extends PureComponent {

static propTypes = {
onUpdate: PropTypes.func.isRequired,
startAngle: PropTypes.number.isRequired,
angleLength: PropTypes.number.isRequired,
segments: PropTypes.number,
strokeWidth: PropTypes.number,
radius: PropTypes.number,
gradientColorFrom: PropTypes.string,
gradientColorTo: PropTypes.string,
showClockFace: PropTypes.bool,
clockFaceColor: PropTypes.string,
bgCircleColor: PropTypes.string,
stopIcon: PropTypes.element,
startIcon: PropTypes.element,
showStopKnob: PropTypes.bool,
showStartKnob: PropTypes.bool,
keepArcVisible: PropTypes.bool,
roundedEnds: PropTypes.bool,
allowKnobBeyondLimits: PropTypes.bool,
knobStrokeColor: PropTypes.string,
knobFillColor: PropTypes.string,
knobRadius: PropTypes.number,
knobStrokeWidth: PropTypes.number,
maxAngleLength: PropTypes.number,
onReleaseStartKnob: PropTypes.func,
onReleaseStopKnob: PropTypes.func,
onPressSliderPath: PropTypes.func,
}

static defaultProps = {
segments: 5,
strokeWidth: 40,
radius: 145,
gradientColorFrom: '#ff9800',
gradientColorTo: '#ffcf00',
clockFaceColor: '#9d9d9d',
bgCircleColor: '#171717',
showStopKnob: true,
showStartKnob: true,
keepArcVisible: false,
roundedEnds: false,
allowKnobBeyondLimits: true,
knobStrokeColor: '#fff',
knobFillColor: '#ff9800',
}

state = {
circleCenterX: false,
circleCenterY: false,
}

constructor(props) {
  super(props);

  const { startAngle, angleLength, maxAngleLength } = this.props;
  this.initialStartAngle = startAngle;
  this.initialAngleLength = maxAngleLength ? maxAngleLength : angleLength;
}

componentWillMount() {
this._sleepPanResponder = PanResponder.create({
onMoveShouldSetPanResponder: (evt, gestureState) => true,
onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
onPanResponderGrant: (evt, gestureState) => this.setCircleCenter(),
onPanResponderMove: (evt, { moveX, moveY }) => {
    const { circleCenterX, circleCenterY } = this.state;
    const { angleLength, startAngle, onUpdate, allowKnobBeyondLimits } = this.props;

    const currentAngleStop = (startAngle + angleLength) % (2 * Math.PI);
    let newAngle = Math.atan2(moveY - circleCenterY, moveX - circleCenterX) + Math.PI/2;

    if (newAngle < 0) {
      newAngle += 2 * Math.PI;
    }

    let newAngleLength = currentAngleStop - newAngle;

    if (newAngleLength < 0) {
      newAngleLength += 2 * Math.PI;
    }

    newAngleLength = newAngleLength % (2 * Math.PI);

    if (!allowKnobBeyondLimits && newAngleLength > this.initialAngleLength) {
      return;
    }

    onUpdate({ startAngle: newAngle, angleLength: newAngleLength });
  },
  onPanResponderRelease: (evt, gestureState) => {
    const { onReleaseStartKnob } = this.props;
    if (onReleaseStartKnob) {
      onReleaseStartKnob();
    }
  },
  onPanResponderTerminationRequest: (evt, gestureState) => true,
});

this._wakePanResponder = PanResponder.create({
  onMoveShouldSetPanResponder: (evt, gestureState) => true,
  onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
  onPanResponderGrant: (evt, gestureState) => this.setCircleCenter(),
  onPanResponderMove: (evt, { moveX, moveY }) => {
    const { circleCenterX, circleCenterY } = this.state;
    const { angleLength, startAngle, onUpdate, allowKnobBeyondLimits } = this.props;

    let newAngle = Math.atan2(moveY - circleCenterY, moveX - circleCenterX) + Math.PI/2;
    let newAngleLength = (newAngle - startAngle) % (2 * Math.PI);

    if (newAngleLength < 0) {
      newAngleLength += 2 * Math.PI;
    }

    if (!allowKnobBeyondLimits && newAngleLength > this.initialAngleLength) {
      return;
    }

    onUpdate({ startAngle, angleLength: newAngleLength });
  },
  onPanResponderRelease: (evt, gestureState) => {
    const { onReleaseStopKnob } = this.props;
    if (onReleaseStopKnob) {
      onReleaseStopKnob();
    }
  },
  onPanResponderTerminationRequest: (evt, gestureState) => true,
});

this._pathPanResponder = PanResponder.create({
  onStartShouldSetPanResponder: (evt, gestureState) => true,
  onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
  onMoveShouldSetPanResponder: (evt, gestureState) => true,
  onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
  onPanResponderGrant: (evt, gestureState) => {
    this.setCircleCenter();
    const { circleCenterX, circleCenterY } = this.state;
    const { angleLength, startAngle, onUpdate, allowKnobBeyondLimits, onPressSliderPath } = this.props;

    const { x0, y0 } = gestureState;
    let newAngle = Math.atan2(y0 - circleCenterY, x0 - circleCenterX) + Math.PI/2;
    let newAngleLength = (newAngle - startAngle) % (2 * Math.PI);

    if (newAngleLength < 0) {
      newAngleLength += 2 * Math.PI;
    }

    if (!allowKnobBeyondLimits && newAngleLength > this.initialAngleLength) {
      return;
    }
    if (onPressSliderPath) {
      onPressSliderPath({ startAngle, angleLength: newAngleLength });
    }
  },
  onPanResponderTerminationRequest: (evt, gestureState) => true,
});
}

onLayout = () => {
this.setCircleCenter();
}

setCircleCenter = () => {
this._circle.measure((x, y, w, h, px, py) => {
const halfOfContainer = this.getContainerWidth() / 2;
this.setState({ circleCenterX: px + halfOfContainer, circleCenterY: py + halfOfContainer });
});
}

getContainerWidth() {
const { strokeWidth, radius } = this.props;
return strokeWidth + radius * 2 + 2;
}

render() {
const {
  startAngle,
  angleLength,
  segments,
  strokeWidth,
  radius,
  gradientColorFrom,
  gradientColorTo,
  bgCircleColor,
  showClockFace,
  clockFaceColor,
  startIcon,
  stopIcon,
  showStopKnob,
  showStartKnob,
  keepArcVisible,
  roundedEnds,
  knobStrokeColor,
  knobFillColor,
  knobRadius,
  knobStrokeWidth,
} = this.props;

const containerWidth = this.getContainerWidth();

const start = calculateArcCircle(0, segments, radius, startAngle, angleLength);
const stop = calculateArcCircle(segments - 1, segments, radius, startAngle, angleLength);

// To make the knob does not get clipped when it is larger than slider.
const knobSizeToAccount = knobRadius + knobStrokeWidth;
const contWidthWithKnobSize = containerWidth + knobSizeToAccount;

// SVG will always stay left/top aligned , So tweak viewbox x & y and make sure it is aligned center.
const viewBoxX = knobSizeToAccount / 2;
const viewBoxY = knobSizeToAccount / 2;

return (
  <View style={{
    width: contWidthWithKnobSize,
    height: contWidthWithKnobSize,
  }} onLayout={this.onLayout}>
    <Svg
      height={contWidthWithKnobSize}
      width={contWidthWithKnobSize}
      ref={circle => this._circle = circle}
      viewBox={`${-viewBoxX} ${-viewBoxY} ${contWidthWithKnobSize} ${contWidthWithKnobSize}`}
    >
      <Defs>
        {
          range(segments).map(i => {
            const { fromX, fromY, toX, toY } = calculateArcCircle(i, segments, radius, startAngle, angleLength);
            const { fromColor, toColor } = calculateArcColor(i, segments, gradientColorFrom, gradientColorTo)
            return (
              <LinearGradient key={i} id={getGradientId(i)} x1={fromX.toFixed(2)} y1={fromY.toFixed(2)} x2={toX.toFixed(2)} y2={toY.toFixed(2)}>
                <Stop offset="0%" stopColor={fromColor} />
                <Stop offset="100%" stopColor={toColor} />
              </LinearGradient>
            )
          })
        }
      </Defs>

      {/*
        ##### Circle
      */}

      <G x={`${strokeWidth/2 + radius + 1}`} y={`${strokeWidth/2 + radius + 1}`} transform={{ translate: `${strokeWidth/2 + radius + 1}, ${strokeWidth/2 + radius + 1}` }}>
        <Circle
          r={radius}
          strokeWidth={strokeWidth}
          fill="transparent"
          stroke={bgCircleColor}
        />
        {
          showClockFace && (
            <ClockFace
              r={radius - strokeWidth / 2}
              stroke={clockFaceColor}
            />
          )
        }
        {
          range(segments).map(i => {
            const sAngle = keepArcVisible ? this.initialStartAngle : startAngle;
            const aLength = keepArcVisible ? this.initialAngleLength : angleLength;

            const { fromX, fromY, toX, toY } = calculateArcCircle(i, segments, radius, sAngle, aLength);
            const d = `M ${fromX.toFixed(2)} ${fromY.toFixed(2)} A ${radius} ${radius} 0 0 1 ${toX.toFixed(2)} ${toY.toFixed(2)}`;

            const cornerRadius = (strokeWidth * 0.4933);
            return (
              <React.Fragment key={i}>
                {i === 0 && roundedEnds && (<Circle
                  key={`${i}c1`}
                  cx={fromX}
                  cy={fromY}
                  r={cornerRadius}
                  fill={gradientColorFrom}
                />)}
                {i === (segments - 1) && roundedEnds && (<Circle
                  key={`${i}c2`}
                  cx={toX}
                  cy={toY}
                  r={cornerRadius}
                  fill={gradientColorTo}
                />)}
                <Path
                  d={d}
                  key={i}
                  strokeWidth={strokeWidth}
                  stroke={`url(#${getGradientId(i)})`}
                  fill="transparent"
                  {...this._pathPanResponder.panHandlers}
                />
              </React.Fragment>
            )
          })
        }

        {/*
          ##### Stop Icon
        */}

        {showStopKnob &&  <G
            x={`${stop.toX}`}
            y={`${stop.toY}`}
            fill={gradientColorTo}
            transform={{ translate: `${stop.toX}, ${stop.toY}` }}
            onPressIn={() => this.setState({ angleLength: angleLength + Math.PI / 2 })}
            {...this._wakePanResponder.panHandlers}
          >
            <Circle
              r={knobRadius ? knobRadius : (strokeWidth - 1) / 2}
              fill={knobFillColor}
              stroke={knobStrokeColor}
              strokeWidth={knobStrokeWidth}
            />
            {
              stopIcon
            }
          </G>
        }

        {/*
          ##### Start Icon
        */}

        {showStartKnob &&  <G
            x={`${start.fromX}`}
            y={`${start.fromY}`}
            fill={gradientColorFrom}
            transform={{ translate: `${start.fromX}, ${start.fromY}` }}
            onPressIn={() => this.setState({ startAngle: startAngle - Math.PI / 2, angleLength: angleLength + Math.PI / 2 })}
            {...this._sleepPanResponder.panHandlers}
          >
            <Circle
              r={knobRadius ? knobRadius : (strokeWidth - 1) / 2}
              fill={knobFillColor}
              stroke={knobStrokeColor}
              strokeWidth={knobStrokeWidth}
            />
            {
              startIcon
            }
          </G>
        }
      </G>
    </Svg>
  </View>
);
}
}