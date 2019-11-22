package models

import (
	"strconv"
	"time"

	"github.com/jmoiron/sqlx"
)

type PerformerQueryBuilder struct{}

const performerTable = "performers"
const performerAliasesJoinTable = "performer_aliases"
const performerUrlsJoinTable = "performer_urls"
const performerTattoosJoinTable = "performer_tattoos"
const performerPiercingsJoinTable = "performer_piercings"
const performerJoinKey = "performer_id"

func NewPerformerQueryBuilder() PerformerQueryBuilder {
	return PerformerQueryBuilder{}
}

func (qb *PerformerQueryBuilder) toModel(ro interface{}) *Performer {
	if ro != nil {
		return ro.(*Performer)
	}

	return nil
}

func (qb *PerformerQueryBuilder) Create(newPerformer Performer, tx *sqlx.Tx) (*Performer, error) {
	ret, err := DBIWithTxn(tx).Insert(newPerformer)
	return qb.toModel(ret), err
}

func (qb *PerformerQueryBuilder) Update(updatedPerformer Performer, tx *sqlx.Tx) (*Performer, error) {
	ret, err := DBIWithTxn(tx).Update(updatedPerformer)
	return qb.toModel(ret), err
}

func (qb *PerformerQueryBuilder) Destroy(id int64, tx *sqlx.Tx) error {
	return DBIWithTxn(tx).Delete(id, performerDBTable)
}

func (qb *PerformerQueryBuilder) CreateAliases(newJoins PerformerAliases, tx *sqlx.Tx) error {
	return DBIWithTxn(tx).InsertJoins(performerAliasTable, &newJoins)
}

func (qb *PerformerQueryBuilder) UpdateAliases(performerID int64, updatedJoins PerformerAliases, tx *sqlx.Tx) error {
	return DBIWithTxn(tx).ReplaceJoins(performerAliasTable, performerID, &updatedJoins)
}

func (qb *PerformerQueryBuilder) CreateUrls(newJoins PerformerUrls, tx *sqlx.Tx) error {
	return DBIWithTxn(tx).InsertJoins(performerUrlTable, &newJoins)
}

func (qb *PerformerQueryBuilder) UpdateUrls(performerID int64, updatedJoins PerformerUrls, tx *sqlx.Tx) error {
	return DBIWithTxn(tx).ReplaceJoins(performerUrlTable, performerID, &updatedJoins)
}

func (qb *PerformerQueryBuilder) CreateTattoos(newJoins PerformerBodyMods, tx *sqlx.Tx) error {
	return DBIWithTxn(tx).InsertJoins(performerTattooTable, &newJoins)
}

func (qb *PerformerQueryBuilder) UpdateTattoos(performerID int64, updatedJoins PerformerBodyMods, tx *sqlx.Tx) error {
	return DBIWithTxn(tx).ReplaceJoins(performerTattooTable, performerID, &updatedJoins)
}

func (qb *PerformerQueryBuilder) CreatePiercings(newJoins PerformerBodyMods, tx *sqlx.Tx) error {
	return DBIWithTxn(tx).InsertJoins(performerPiercingTable, &newJoins)
}

func (qb *PerformerQueryBuilder) UpdatePiercings(performerID int64, updatedJoins PerformerBodyMods, tx *sqlx.Tx) error {
	return DBIWithTxn(tx).ReplaceJoins(performerPiercingTable, performerID, &updatedJoins)
}

func (qb *PerformerQueryBuilder) Find(id int64, tx *sqlx.Tx) (*Performer, error) {
	ret, err := DBIWithTxn(tx).Find(id, performerDBTable)
	return qb.toModel(ret), err
}

func (qb *PerformerQueryBuilder) FindBySceneID(sceneID int, tx *sqlx.Tx) (Performers, error) {
	query := `
		SELECT performers.* FROM performers
		LEFT JOIN performers_scenes as scenes_join on scenes_join.performer_id = performers.id
		LEFT JOIN scenes on scenes_join.scene_id = scenes.id
		WHERE scenes.id = ?
		GROUP BY performers.id
	`
	args := []interface{}{sceneID}
	return qb.queryPerformers(query, args, tx)
}

func (qb *PerformerQueryBuilder) FindByNames(names []string, tx *sqlx.Tx) (Performers, error) {
	query := "SELECT * FROM performers WHERE name IN " + getInBinding(len(names))
	var args []interface{}
	for _, name := range names {
		args = append(args, name)
	}
	return qb.queryPerformers(query, args, tx)
}

func (qb *PerformerQueryBuilder) FindByAliases(names []string, tx *sqlx.Tx) (Performers, error) {
	query := `SELECT performers.* FROM performers
		left join performer_aliases on performers.id = performer_aliases.performer_id
		WHERE performer_aliases.alias IN ` + getInBinding(len(names))

	var args []interface{}
	for _, name := range names {
		args = append(args, name)
	}
	return qb.queryPerformers(query, args, tx)
}

func (qb *PerformerQueryBuilder) FindByName(name string, tx *sqlx.Tx) (Performers, error) {
	query := "SELECT * FROM performers WHERE upper(name) = upper(?)"
	var args []interface{}
	args = append(args, name)
	return qb.queryPerformers(query, args, tx)
}

func (qb *PerformerQueryBuilder) FindByAlias(name string, tx *sqlx.Tx) (Performers, error) {
	query := `SELECT performers.* FROM performers
		left join performer_aliases on performers.id = performer_aliases.performer_id
		WHERE upper(performer_aliases.alias) = UPPER(?)`

	var args []interface{}
	args = append(args, name)
	return qb.queryPerformers(query, args, tx)
}

func (qb *PerformerQueryBuilder) Count() (int, error) {
	return runCountQuery(buildCountQuery("SELECT performers.id FROM performers"), nil)
}

func (qb *PerformerQueryBuilder) Query(performerFilter *PerformerFilterType, findFilter *QuerySpec) ([]*Performer, int) {
	if performerFilter == nil {
		performerFilter = &PerformerFilterType{}
	}
	if findFilter == nil {
		findFilter = &QuerySpec{}
	}

	query := queryBuilder{
		tableName: "performers",
	}

	query.body = selectDistinctIDs("performers")

	if q := performerFilter.Name; q != nil && *q != "" {
		searchColumns := []string{"performers.name"}
		clause, thisArgs := getSearchBinding(searchColumns, *q, false)
		query.addWhere(clause)
		query.addArg(thisArgs...)
	}

	if birthYear := performerFilter.BirthYear; birthYear != nil {
		clauses, thisArgs := getBirthYearFilterClause(birthYear.Modifier, birthYear.Value)
		query.addWhere(clauses...)
		query.addArg(thisArgs...)
	}

	if age := performerFilter.Age; age != nil {
		clauses, thisArgs := getAgeFilterClause(age.Modifier, age.Value)
		query.addWhere(clauses...)
		query.addArg(thisArgs...)
	}

	//handleStringCriterion("ethnicity", performerFilter.Ethnicity, &query)
	handleStringCriterion("country", performerFilter.Country, &query)
	//handleStringCriterion("eye_color", performerFilter.EyeColor, &query)
	//handleStringCriterion("height", performerFilter.Height, &query)
	//handleStringCriterion("measurements", performerFilter.Measurements, &query)
	//handleStringCriterion("fake_tits", performerFilter.FakeTits, &query)
	//handleStringCriterion("career_length", performerFilter.CareerLength, &query)
	//handleStringCriterion("tattoos", performerFilter.Tattoos, &query)
	//handleStringCriterion("piercings", performerFilter.Piercings, &query)
	//handleStringCriterion("aliases", performerFilter.Aliases, &query)

	query.sortAndPagination = qb.getPerformerSort(findFilter) + getPagination(findFilter)
	idsResult, countResult := query.executeFind()

	var performers []*Performer
	for _, id := range idsResult {
		performer, _ := qb.Find(id, nil)
		performers = append(performers, performer)
	}

	return performers, countResult
}

func getBirthYearFilterClause(criterionModifier CriterionModifier, value int) ([]string, []interface{}) {
	var clauses []string
	var args []interface{}

	yearStr := strconv.Itoa(value)
	startOfYear := yearStr + "-01-01"
	endOfYear := yearStr + "-12-31"

	if modifier := criterionModifier.String(); criterionModifier.IsValid() {
		switch modifier {
		case "EQUALS":
			// between yyyy-01-01 and yyyy-12-31
			clauses = append(clauses, "performers.birthdate >= ?")
			clauses = append(clauses, "performers.birthdate <= ?")
			args = append(args, startOfYear)
			args = append(args, endOfYear)
		case "NOT_EQUALS":
			// outside of yyyy-01-01 to yyyy-12-31
			clauses = append(clauses, "performers.birthdate < ? OR performers.birthdate > ?")
			args = append(args, startOfYear)
			args = append(args, endOfYear)
		case "GREATER_THAN":
			// > yyyy-12-31
			clauses = append(clauses, "performers.birthdate > ?")
			args = append(args, endOfYear)
		case "LESS_THAN":
			// < yyyy-01-01
			clauses = append(clauses, "performers.birthdate < ?")
			args = append(args, startOfYear)
		}
	}

	return clauses, args
}

func getAgeFilterClause(criterionModifier CriterionModifier, value int) ([]string, []interface{}) {
	var clauses []string
	var args []interface{}

	// get the date at which performer would turn the age specified
	dt := time.Now()
	birthDate := dt.AddDate(-value-1, 0, 0)
	yearAfter := birthDate.AddDate(1, 0, 0)

	if modifier := criterionModifier.String(); criterionModifier.IsValid() {
		switch modifier {
		case "EQUALS":
			// between birthDate and yearAfter
			clauses = append(clauses, "performers.birthdate >= ?")
			clauses = append(clauses, "performers.birthdate < ?")
			args = append(args, birthDate)
			args = append(args, yearAfter)
		case "NOT_EQUALS":
			// outside of birthDate and yearAfter
			clauses = append(clauses, "performers.birthdate < ? OR performers.birthdate >= ?")
			args = append(args, birthDate)
			args = append(args, yearAfter)
		case "GREATER_THAN":
			// < birthDate
			clauses = append(clauses, "performers.birthdate < ?")
			args = append(args, birthDate)
		case "LESS_THAN":
			// > yearAfter
			clauses = append(clauses, "performers.birthdate >= ?")
			args = append(args, yearAfter)
		}
	}

	return clauses, args
}

func (qb *PerformerQueryBuilder) getPerformerSort(findFilter *QuerySpec) string {
	var sort string
	var direction string
	if findFilter == nil {
		sort = "name"
		direction = "ASC"
	} else {
		sort = findFilter.GetSort("name")
		direction = findFilter.GetDirection()
	}
	return getSort(sort, direction, "performers")
}

func (qb *PerformerQueryBuilder) queryPerformers(query string, args []interface{}, tx *sqlx.Tx) (Performers, error) {
	output := Performers{}
	err := DBIWithTxn(tx).RawQuery(performerDBTable, query, args, &output)
	return output, err
}

func (qb *PerformerQueryBuilder) GetAliases(id int64) ([]string, error) {
	joins := PerformerAliases{}
	err := DBIWithTxn(nil).FindJoins(performerAliasTable, id, &joins)

	return joins.ToAliases(), err
}

func (qb *PerformerQueryBuilder) GetUrls(id int64) (PerformerUrls, error) {
	joins := PerformerUrls{}
	err := DBIWithTxn(nil).FindJoins(performerUrlTable, id, &joins)

	return joins, err
}

func (qb *PerformerQueryBuilder) GetTattoos(id int64) (PerformerBodyMods, error) {
	joins := PerformerBodyMods{}
	err := DBIWithTxn(nil).FindJoins(performerTattooTable, id, &joins)

	return joins, err
}

func (qb *PerformerQueryBuilder) GetPiercings(id int64) (PerformerBodyMods, error) {
	joins := PerformerBodyMods{}
	err := DBIWithTxn(nil).FindJoins(performerPiercingTable, id, &joins)

	return joins, err
}
