import { levels } from '../../src/config.js';
import { test, expect, start, snapshot, until, waitPlaying, openSaved, continueSaved, rightTo, leftTo, pauseGame, resumeGame } from './helpers.js';
import { createTouchDriver, noHeldFeedback } from './touch-helpers.js';
import { observeResources, frameProfile } from './runtime-helpers.js';
import fs from 'node:fs/promises';
test.use({ trace: 'off' });

test('ten touch cancel, pause, rotation and restart cycles preserve listeners, observers and bodies', async ({ page }) => {
  test.setTimeout(100_000);
  await observeResources(page);
  await start(page);
  const driver = await createTouchDriver(page);
  await page.waitForTimeout(150);
  const before = (await snapshot(page)).counts;
  const resources = await page.evaluate(() => window.__PHASE3_RESOURCES__());
  const cycles = [];
  for(let index=0;index<10;index++) {
    await driver.down('right');
    await driver.down('left');
    await driver.cancel();
    await noHeldFeedback(page);
    await pauseGame(page);
    await page.setViewportSize({ width:844,height:390 });
    await resumeGame(page);
    await page.setViewportSize({ width:390,height:844 });
    await until(page,()=>window.__ACINCO_DEBUG__.snapshot().mode==='PAUSED');
    await page.locator('#restart-button').tap();
    await waitPlaying(page,0);
    await page.waitForTimeout(75);
    const after = (await snapshot(page)).counts;
    const current = await page.evaluate(() => window.__PHASE3_RESOURCES__());
    expect(after).toEqual(before);
    expect(current).toEqual(resources);
    cycles.push({ cycle:index+1,counts:after,resources:current });
  }
  await fs.writeFile('qa/phase4-environment-touch-lifecycle-counts.json',JSON.stringify({before,resources,cycles},null,2)+'\n');
  await driver.destroy();
});

for(const viewport of [{width:390,height:844},{width:844,height:390}]) {
  const orientation=viewport.width<viewport.height?'portrait':'landscape';
  test('thirty-second touch movement profile in '+orientation,async({page},testInfo)=>{
    test.setTimeout(85_000);
    await page.setViewportSize(viewport);
    await observeResources(page);
    await openSaved(page,{version:1,levelIndex:3,checkpointId:1,completed:false});
    await continueSaved(page);
    const driver=await createTouchDriver(page);
    await page.waitForTimeout(1000);
    const callbacks=await page.evaluate(()=>window.__PHASE3_LAYOUT_CALLBACKS__);
    const profiling=frameProfile(page);
    const started=Date.now();
    while(Date.now()-started<30000) {
      await rightTo(page,levels[3].checkpoint.x+80,driver);
      await leftTo(page,levels[3].checkpoint.x-80,driver);
    }
    const result=await profiling;
    result.browser=testInfo.project.name;
    result.levelIndex=3;
    result.emulation='viewport/touch only; no physical mobile CPU or device';
    result.finalCounts=(await snapshot(page)).counts;
    result.layoutCallbacks=await page.evaluate(()=>window.__PHASE3_LAYOUT_CALLBACKS__)-callbacks;
    expect(result.canvas).toEqual({width:480,height:270});
    expect(result.meanFps).toBeGreaterThanOrEqual(30);
    expect(result.layoutCallbacks).toBeLessThan(10);
    await fs.writeFile('qa/phase4-environment-performance-touch-'+orientation+'.json',JSON.stringify(result,null,2)+'\n');
    await driver.destroy();
  });
}

