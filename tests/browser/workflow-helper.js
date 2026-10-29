'use strict';
async function recordFile(page,{file='README.md',content,message='変更を記録',touch=false}){
  const press=locator=>touch?locator.tap():locator.click();
  for(const action of ['edit','stage','commit']){
    if(touch)await press(page.locator('#mobile-tools'));
    await press(page.locator(`#toolbox [data-open="${action}"]`));
    await press(page.locator('[data-slot="target"]'));
    await press(page.locator('.repo-card.local .repo-top'));
    if(await page.locator('#finish-target-picking').isVisible())await press(page.locator('#finish-target-picking'));
    if(action==='edit'){await page.locator('[data-input="file"]').fill(file);await page.locator('[data-input="content"]').fill(content);}
    if(action==='commit')await page.locator('[data-input="message"]').fill(message);
    await press(page.locator('#execute-button'));
  }
}
module.exports={recordFile};
