class DurationMeasureTool {
    constructor() {
        /** @type {TimedAction[]} */
        this.actions = [];
    }

    addAction(name) {
        this.actions.push({
            name,
            createdAt: Date.now(),
        });
    }

    /**
     * @returns {DurationMeasureToolReport}
     */
    report() {
        const totalDuration = this.actions[this.actions.length - 1].createdAt - this.actions[0].createdAt;

        this.actions[0].duration = 0;

        for (let i = 1; i < this.actions.length; i += 1) {
            const action = this.actions[i];
            const prevAction = this.actions[i - 1];

            action.duration = action.createdAt - prevAction.createdAt;
        }

        return {
            totalDuration,
            actions: this.actions.map((action) => ({ name: action.name, duration: action.duration })),
        };
    }
}

/**
 * @param {DurationMeasureToolReport} report
 */
const formatReport = (report) => {
    let formattedReportString = '';

    if (report) {
        formattedReportString = `TOTAL_DURATION: ${report.totalDuration}\n----------\n`;
        report.actions.forEach((action) => { formattedReportString += `${String(action.duration).padEnd(10)}: ${action.name}\n`; });
    }

    return formattedReportString;
};

module.exports = {
    DurationMeasureTool,
    formatReport,
};
