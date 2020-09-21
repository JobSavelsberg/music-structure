import * as d3 from 'd3';
import * as audioUtil from './audioUtil'

export const zeroOneColor = d3.scaleSequential().domain([0,1]).interpolator(d3.interpolateViridis);
export const pitchColor = zeroOneColor;
export const greyScaleColor = d3.scaleSequential().domain([1,0]).interpolator(d3.interpolateGreys);
export const timbreColor = d3.scaleSequential().domain([-1,1]).interpolator(d3.interpolateViridis);
export const rainbowColor = d3.scaleSequential().domain([0, 11]).interpolator(d3.interpolateRainbow);
export const diverging = d3.scaleDiverging().domain([-1, 0, 1]).interpolator(d3.interpolateRdBu);

export function renderRawPitch(track, left, width, yOffset, height, ctx){
    const scale = width/track.getAnalysis().track.duration;
    track.getSegments().forEach((segment)=>{
        for(let i = 0; i < 12; i++){
            const x=left+segment.start*scale;
            const segmentHeight=height/12-2;
            const y=yOffset+(11-i)*(segmentHeight+2);
            const segmentWidth=segment.duration*scale; 
            ctx.fillStyle = pitchColor(segment.segment.pitches[i]);
            ctx.fillRect(x, y, segmentWidth, segmentHeight);
        }
    })
}

export function renderPercussionPitch(track, left, width, yOffset, height, ctx){
    const scale = width/track.getAnalysis().track.duration;
    track.getSegments().forEach((segment, segmentIndex)=>{
        const x=left+segment.start*scale;
        const segmentHeight=height/3-2;
        let y=yOffset+0*(segmentHeight+2);
        const segmentWidth=segment.duration*scale; 
        ctx.fillStyle = pitchColor(segment.tonalityEnergy*2-.5);
        ctx.fillRect(x, y, segmentWidth, segmentHeight);
        y=yOffset+1*(segmentHeight+2);
        ctx.fillStyle = pitchColor(1-segment.tonalityRadius);
        ctx.fillRect(x, y, segmentWidth, segmentHeight);
        y=yOffset+2*(segmentHeight+2);
        ctx.fillStyle = segment.duration > 0.15 ? pitchColor(0) : pitchColor(segment.percussiony);
        ctx.fillRect(x, y, segmentWidth, segmentHeight);
    })
}

export function renderProcessedPitch(track, left, width, yOffset, height, ctx){
    const scale = width/track.getAnalysis().track.duration;
    track.getSegments().forEach((segment)=>{
        for(let i = 0; i < 12; i++){
            const x=left+segment.start*scale;
            const segmentHeight=height/12-2;
            const y=yOffset+(11-i)*(segmentHeight+2);
            const segmentWidth=segment.duration*scale; 
            ctx.fillStyle = pitchColor(segment.pitches[i]);
            ctx.fillRect(x, y, segmentWidth, segmentHeight);
        }
    })
}
export function renderRawTimbre(track, left, width, yOffset, height, ctx){
    const scale = width/track.getAnalysis().track.duration;
    track.getSegments().forEach((segment, segmentIndex)=>{
        for(let i = 0; i < 12; i++){
            const x=left+segment.start*scale;
            const segmentHeight=height/12-2;
            const y=yOffset+(11-i)*(segmentHeight+2);
            const segmentWidth=segment.duration*scale; 
            ctx.fillStyle = diverging(track.getProcessedTimbre(segmentIndex)[i]);
            ctx.fillRect(x, y, segmentWidth, segmentHeight);
        }
    })
}

export function renderRawRhythm(track, left, width, yOffset, height, ctx){
    const scale = width/track.getAnalysis().track.duration;
    track.getBars().forEach((bar)=>{
        const x=left+bar.start*scale;
        const y=yOffset;
        ctx.fillStyle = greyScaleColor(0.3+bar.confidence);
        ctx.fillRect(x, y, 1, height/3);
    });
    track.getBeats().forEach((beat)=>{
        const x=left+beat.start*scale;
        const y=yOffset+height/3;
        ctx.fillStyle = greyScaleColor(0.3+beat.confidence);
        ctx.fillRect(x, y, 1, height/3);
    });
    track.getTatums().forEach((tatum)=>{
        const x=left+tatum.start*scale;
        const y=yOffset + height/3*2;
        ctx.fillStyle = greyScaleColor(0.3+tatum.confidence);
        ctx.fillRect(x, y, 1, height/3);
    });
}

export function renderTonality(track, left, width, yOffset, height, ctx){
    const scale = width/track.getAnalysis().track.duration;
    track.getSegments().forEach((segment)=>{
            const x=left+segment.start*scale;
            const segmentHeight=height;
            const y=yOffset;
            const segmentWidth=segment.duration*scale; 
            ctx.fillStyle = audioUtil.tonalVectorColor(segment.pitches);
            ctx.fillRect(x, y, segmentWidth, segmentHeight);
    })
}



export function renderSSM(track, left, width, yOffset, height, ctx){
    console.log("Rendering ssm...")
    const scale = height/track.getAnalysis().track.duration;
    const size = track.getSegments().length;
    for(let i = 0; i < size; i++){
        for(let j = i; j < size; j++){
            const segmentA = track.getSegment(i)
            const segmentB = track.getSegment(j)

            const pitch = track.getSSM()[i][j-i][0];

            ctx.fillStyle = greyScaleColor(Math.pow(pitch,4));

            const x=left+segmentA.start*scale;
            const segmentWidth=segmentA.duration*scale; 

            const y=yOffset+segmentB.start*scale;
            const segmentHeight=segmentB.duration*scale;
            if(!segmentHeight){
                return;
            }
            ctx.fillRect(x, y, segmentWidth, segmentHeight);

            const timbre = track.getSSM()[i][j-i][1];

            ctx.fillStyle = greyScaleColor(Math.pow(timbre,5));
            ctx.fillRect(y+left-yOffset, x-left+yOffset, segmentHeight, segmentWidth);
        }
    }
}