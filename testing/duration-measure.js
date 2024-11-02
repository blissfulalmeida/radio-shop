const { DurationMeasureTool } = require('../src/components/duration-measure-tool');

(async () => {
    try {
        const measure = new DurationMeasureTool();

        measure.addAction('START');

        await new Promise((resolve) => setTimeout(resolve, 1000));

        measure.addAction('AFTER_1_SEC');

        await new Promise((resolve) => setTimeout(resolve, 2000));

        measure.addAction('AFTER_2_SEC');

        await new Promise((resolve) => setTimeout(resolve, 3000));

        measure.addAction('AFTER_3_SEC');

        const report = measure.report();

        console.log(JSON.stringify(report, null, 2));
    } catch (error) {
        console.error(error);
    }
})();
